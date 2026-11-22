!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "HAKQN - Ho so khai thac va van chuyen go keo"
OutFile "..\dist\HAKQN-HoSoKhaiThac-Setup-3.2.0.exe"
InstallDir "$LOCALAPPDATA\Programs\HAKQN"
RequestExecutionLevel user
SetCompressor /SOLID lzma

!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\orange-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\orange-uninstall.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\HAKQN - Ho so khai thac va van chuyen go keo.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Chay HAKQN ngay bay gio"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Vietnamese"

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  File /r "..\dist\win-unpacked\*.*"

  CreateDirectory "$SMPROGRAMS\HAKQN"
  CreateShortcut "$SMPROGRAMS\HAKQN\HAKQN.lnk" "$INSTDIR\HAKQN - Ho so khai thac va van chuyen go keo.exe"
  CreateShortcut "$SMPROGRAMS\HAKQN\Go cai dat HAKQN.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\HAKQN.lnk" "$INSTDIR\HAKQN - Ho so khai thac va van chuyen go keo.exe"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAKQN" "DisplayName" "HAKQN - Ho so khai thac va van chuyen go keo"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAKQN" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAKQN" "DisplayIcon" '"$INSTDIR\HAKQN - Ho so khai thac va van chuyen go keo.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAKQN" "Publisher" "HAK Group"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAKQN" "DisplayVersion" "3.2.0"
SectionEnd

Section "Uninstall"
  RMDir /r "$INSTDIR"
  RMDir /r "$SMPROGRAMS\HAKQN"
  Delete "$DESKTOP\HAKQN.lnk"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAKQN"
SectionEnd
