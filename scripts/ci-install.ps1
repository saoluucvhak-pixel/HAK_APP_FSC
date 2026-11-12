# Chạy bộ cài NSIS ở chế độ im lặng và GHI LẠI chẩn đoán (mã thoát, phiên bản, commit, kích thước, mã băm, thời gian, nội dung thư mục cài) vào diag/install-<tag>.txt.
# Luôn ghi file chẩn đoán, kể cả khi lỗi, để bước "thu thập chẩn đoán" tải lên artifact. Hàm trả về mã thoát; bước gọi tự quyết định có dừng hay không.
function Install-Setup {
  param([Parameter(Mandatory)][string]$Setup, [Parameter(Mandatory)][string]$Dir, [Parameter(Mandatory)][string]$Tag)
  $diag = Join-Path (Get-Location) 'diag'; New-Item -ItemType Directory $diag -Force | Out-Null
  $ver = (Get-Content package.json -Raw | ConvertFrom-Json).version
  $item = Get-Item $Setup; $sha = (Get-FileHash $Setup -Algorithm SHA256).Hash
  $t0 = Get-Date
  $p = Start-Process -FilePath $Setup -ArgumentList '/S', "/D=$Dir" -Wait -PassThru
  $dt = [math]::Round(((Get-Date) - $t0).TotalSeconds, 1)
  $exit = $p.ExitCode
  $listing = if (Test-Path $Dir) { (Get-ChildItem $Dir -ErrorAction SilentlyContinue | Select-Object -First 30 | ForEach-Object { '{0}  {1}' -f $_.Length, $_.Name }) -join "`n" } else { '(thư mục cài không tồn tại)' }
  @("tag=$Tag", "exit=$exit", ('exit_hex=0x{0:X8}' -f ([uint32]([int64]$exit -band 4294967295))), "seconds=$dt", "version_in_repo=$ver", "commit=$env:TESTED_SHA", "workflow_run=$env:GITHUB_RUN_ID attempt=$env:GITHUB_RUN_ATTEMPT event=$env:GITHUB_EVENT_NAME",
    "setup=$($item.FullName)", "setup_size=$($item.Length)", "setup_sha256=$sha", "install_dir=$Dir", "started=$($t0.ToString('o'))", 'install_dir_listing:', $listing) | Set-Content (Join-Path $diag "install-$Tag.txt") -Encoding utf8
  return $exit
}
