!include "nsDialogs.nsh"

!ifndef BUILD_UNINSTALLER
!macro customPageAfterChangeDir
  Page custom HakqnAccountPage HakqnAccountLeave
!macroend

!macro customInit
  ${If} ${FileExists} "$INSTDIR\resources\hakqn-account-setup"
    StrCpy $HakqnAccountMode "account"
  ${EndIf}
!macroend

!macro customHeader
Var HakqnAccountMode
Var HakqnAccountRadio

Function HakqnAccountPage
  ${If} ${isUpdated}
  ${OrIf} $hasPerUserInstallation == "1"
  ${OrIf} $hasPerMachineInstallation == "1"
    Abort
  ${EndIf}
  !insertmacro MUI_HEADER_TEXT "Chế độ sử dụng HAKQN" "Chọn cách mở ứng dụng sau khi cài."
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateRadioButton} 0 6u 100% 14u "Một người sử dụng (bỏ qua tạo tài khoản)"
  Pop $1
  ${NSD_CreateLabel} 12u 23u 88% 26u "Mở HAKQN trực tiếp. Có thể bật đăng nhập sau trong Cài đặt."
  Pop $0

  ${NSD_CreateRadioButton} 0 58u 100% 14u "Sử dụng tài khoản đăng nhập"
  Pop $HakqnAccountRadio
  ${NSD_CreateLabel} 12u 75u 88% 34u "Sau khi cài, HAKQN yêu cầu tạo tên đăng nhập và mật khẩu trước khi mở hồ sơ."
  Pop $0
  ${NSD_CreateButton} 0 121u 62u 16u "Bỏ qua"
  Pop $0
  ${NSD_OnClick} $0 HakqnAccountSkip

  ${If} $HakqnAccountMode == "account"
    ${NSD_Check} $HakqnAccountRadio
  ${Else}
    ${NSD_Check} $1
  ${EndIf}
  nsDialogs::Show
FunctionEnd

Function HakqnAccountSkip
  Pop $0
  ${NSD_Uncheck} $HakqnAccountRadio
  SendMessage $HWNDPARENT ${WM_COMMAND} 1 0
FunctionEnd

Function HakqnAccountLeave
  ${NSD_GetState} $HakqnAccountRadio $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $HakqnAccountMode "account"
  ${Else}
    StrCpy $HakqnAccountMode "single"
  ${EndIf}
FunctionEnd
!macroend

!macro customInstall
  ${If} $HakqnAccountMode == "account"
    ClearErrors
    FileOpen $0 "$INSTDIR\resources\hakqn-account-setup" w
    ${If} ${Errors}
      MessageBox MB_ICONSTOP "Không lưu được lựa chọn đăng nhập. Hãy cài lại ở thư mục có quyền ghi."
      SetErrorLevel 1
      Abort
    ${EndIf}
    FileClose $0
  ${EndIf}
!macroend
!endif
