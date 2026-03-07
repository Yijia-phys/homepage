quarto render

$msg = Read-Host "Please enter a commit message (press Enter to use the default message)"

if ([string]::IsNullOrWhiteSpace($msg)) {
    $msg = "Update blog: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

git add .
git commit -m "$msg"
git push origin main

Write-Host "Yattaze" -ForegroundColor Green