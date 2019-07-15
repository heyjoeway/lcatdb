@echo off

echo Make sure you have Node.js, Ruby, Sass, and Grunt installed before running this script!
echo If you don't, either close this window or press Ctrl+C to exit.
echo If you do, then press enter to continue.

pause

cd client
pause
call npm install
pause
call grunt
pause
cd ..
pause
cd server
pause
call npm install
pause
cd ..
pause
mklink .\client\build\www .\server\www
pause
mklink .\client\build\views .\server\views
pause
echo Done!
pause