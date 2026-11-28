@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python 3 が見つかりません。ビルドには Python 3 が必要です。 1>&2
  exit /b 1
)

python -m pip install --quiet --upgrade pyinstaller || exit /b 1

pushd helper
python -m unittest || (popd & exit /b 1)
popd

python -m PyInstaller --noconfirm --clean --onefile --name fiora_guide --paths helper ^
  --distpath release --workpath build --specpath build ^
  --add-data "%~dp0index.html;." --add-data "%~dp0editor.html;." ^
  --add-data "%~dp0app.js;." --add-data "%~dp0styles.css;." ^
  helper\fiora_guide.py || exit /b 1

if exist release\data rmdir /s /q release\data
xcopy /e /i /q data release\data >nul || exit /b 1

echo.
echo 完成: %~dp0release\fiora_guide.exe (data フォルダも release に配置済み)
endlocal
