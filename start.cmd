@echo off
rem Claudition launcher: double-click, or run "start.cmd -Voice" for the neural voice.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
