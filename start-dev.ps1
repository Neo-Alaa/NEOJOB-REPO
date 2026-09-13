# NeoJob — starts the dev database (dedicated MariaDB instance on port 3307,
# separate from XAMPP's own broken/shared one) and the PHP dev server.
# Run this from PowerShell each time you want to work on the project:
#   powershell -ExecutionPolicy Bypass -File start-dev.ps1

$ProjectRoot = $PSScriptRoot
$MysqlData = Join-Path $ProjectRoot "database\mysql-data"

Write-Host "Starting MariaDB (port 3307)..."
Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" `
  -ArgumentList "--datadir=`"$MysqlData`"", "--port=3307", "--socket=`"$MysqlData\mysql.sock`""

Start-Sleep -Seconds 2

Write-Host "Starting PHP dev server (http://localhost:8873)..."
Start-Process -FilePath "C:\xampp\php\php.exe" `
  -ArgumentList "-S", "localhost:8873", "-t", "`"$ProjectRoot`"" `
  -WorkingDirectory $ProjectRoot

Write-Host ""
Write-Host "NeoJob is running at http://localhost:8873"
Write-Host "Close the two new windows that opened to stop the servers."
