param(
  [Parameter(Mandatory)][string]$OldVersion,
  [Parameter(Mandatory)][string]$Sha256,
  [switch]$AllowMissingRelease
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'ci-install.ps1')
$short = $OldVersion.Replace('.', '')
$asset = "HAKQN-HoSoKhaiThac-Setup-$OldVersion.exe"
$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version
if ($ver -eq $OldVersion) { return }
$old = Join-Path $env:RUNNER_TEMP "old-release-${short}"; New-Item -ItemType Directory $old | Out-Null
gh release download "v$OldVersion" --repo $env:GITHUB_REPOSITORY -p $asset -D $old
$oldSetup = Join-Path $old $asset
if (-not (Test-Path $oldSetup)) {
  if ($AllowMissingRelease) { Write-Host "::warning::Không tìm thấy bộ cài v$OldVersion."; return }
  throw "Không tìm thấy bộ cài v$OldVersion."
}
$h = (Get-FileHash $oldSetup -Algorithm SHA256).Hash
if ($h -ne $Sha256) { throw "Bộ cài v$OldVersion tải về không khớp mã băm công bố: $h" }
$dir = Join-Path $env:RUNNER_TEMP "HAKQN-upgrade${short}"; $ud = Join-Path $env:RUNNER_TEMP "hakqn-upgrade${short}-userdata"
$ec = Install-Setup -Setup $oldSetup -Dir $dir -Tag "upgrade-v${short}-old"
if ($ec -ne 0) { throw "Cài v$OldVersion lỗi, mã thoát $ec" }
$oldApp = Get-ChildItem $dir -Filter '*.exe' | Where-Object { $_.Name -notmatch 'Uninstall' } | Select-Object -First 1
if (-not $oldApp) { throw "Không thấy file chạy của v$OldVersion sau khi cài" }
# chính bản v$OldVersion đã cài ghi dữ liệu (1 chủ rừng, 2 lô, phiếu cân) và chốt một lô (fchot) rồi tự thoát
$env:HAKQN_USERDATA = $ud; $env:HAKQN_SMOKE = Join-Path $env:RUNNER_TEMP "smoke-v${short}-old.json"; $env:HAKQN_SMOKE_PHASE = 'create'
$pr = Start-Process -FilePath $oldApp.FullName -PassThru -WindowStyle Hidden
if (-not $pr.WaitForExit(120000)) { $pr.Kill(); throw "v${OldVersion}: ứng dụng không tự thoát sau 120 giây" }
Get-Content $env:HAKQN_SMOKE -Raw
if ($pr.ExitCode -ne 0) { throw "v$OldVersion không tạo được dữ liệu thử (mã thoát $($pr.ExitCode))" }
$oldRes = Get-Content $env:HAKQN_SMOKE -Raw | ConvertFrom-Json
if ($oldRes.version -ne $OldVersion) { throw "Bản cũ chạy không đúng phiên bản: $($oldRes.version)" }
if ($oldRes.chotTaoLuc -ne 'create') { throw "Bản $OldVersion không tạo được lô đã chốt để thử cài đè" }
# cài đè bản mới lên đúng thư mục đã cài v$OldVersion
$setup = (Get-ChildItem dist -Filter '*Setup*.exe').FullName
$ec = Install-Setup -Setup $setup -Dir $dir -Tag "upgrade-v${short}-new"
if ($ec -ne 0) { throw "Cài đè bản mới lên v$OldVersion lỗi, mã thoát $ec" }
$newApp = Get-ChildItem $dir -Filter '*.exe' | Where-Object { $_.Name -notmatch 'Uninstall' } | Select-Object -First 1
$out = Join-Path $env:RUNNER_TEMP "smoke-upgrade${short}.json"
$env:HAKQN_SMOKE = $out; $env:HAKQN_SMOKE_PHASE = if ($OldVersion -eq '2.3.0') { 'verify230' } else { 'verify' }
$pr = Start-Process -FilePath $newApp.FullName -PassThru -WindowStyle Hidden
if (-not $pr.WaitForExit(120000)) { $pr.Kill(); throw "Nâng cấp ${OldVersion}: ứng dụng không tự thoát sau 120 giây" }
if (-not (Test-Path $out)) { throw "Nâng cấp ${OldVersion}: không có file kết quả (mã thoát $($pr.ExitCode))" }
Get-Content $out -Raw
if ($pr.ExitCode -ne 0) { throw "Nâng cấp ${OldVersion}: kiểm tra dữ liệu thất bại (mã thoát $($pr.ExitCode))" }
$r = Get-Content $out -Raw | ConvertFrom-Json
if ($r.version -ne $ver) { throw "Sau khi cài đè vẫn chạy phiên bản $($r.version), mong đợi $ver" }
# lô đã chốt là lô do bản $OldVersion tạo (bản mới không tạo lại) và vẫn chỉ đọc, đúng phiên bản chốt, nguyên vẹn sau khi cài đè
if ($r.chotTaoLuc) { throw "Sau khi cài đè không còn lô đã chốt của bản $OldVersion (bản mới phải tạo lại)" }
if (-not ($r.checks.chotReadOnly -and $r.checks.chotVersion -and $r.checks.chotIntegrity -and $r.checks.chotUi)) { throw "Sau khi cài đè lên ${OldVersion}: lô đã chốt không còn chỉ đọc / sai phiên bản / không nguyên vẹn" }
Copy-Item $out "dist/smoke-upgrade${short}.json"
