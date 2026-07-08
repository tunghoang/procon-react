@echo off

REM Build
call yarn build
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

REM Copy build folder on remote server
scp -r ./build procon26:~/procon-team-manager/

echo Deployment complete.
pause