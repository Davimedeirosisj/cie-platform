# DAY 1 Staging Deployment - Interactive Guide
# This script walks you through each step of Day 1

param(
    [switch]$NoWait,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Colors
$Colors = @{
    Green = [System.ConsoleColor]::Green
    Red = [System.ConsoleColor]::Red
    Yellow = [System.ConsoleColor]::Yellow
    Blue = [System.ConsoleColor]::Blue
    Cyan = [System.ConsoleColor]::Cyan
}

function Write-Status($message, $status) {
    $icon = if ($status -eq "ok") { "✅" } else { "❌" }
    $color = if ($status -eq "ok") { $Colors.Green } else { $Colors.Red }
    Write-Host "$icon $message" -ForegroundColor $color
}

function Write-Section($title) {
    Write-Host ""
    Write-Host "════════════════════════════════════════" -ForegroundColor $Colors.Blue
    Write-Host $title -ForegroundColor $Colors.Blue
    Write-Host "════════════════════════════════════════" -ForegroundColor $Colors.Blue
    Write-Host ""
}

function Wait-ForKey {
    if (-not $NoWait) {
        Write-Host "Press Enter to continue..." -ForegroundColor $Colors.Yellow
        $null = Read-Host
    }
}

function Test-Command {
    param([string]$Command)
    try {
        $result = & $Command 2>&1
        return $true, $result
    } catch {
        return $false, $_.Exception.Message
    }
}

function Log-Result {
    param(
        [string]$Step,
        [string]$Result,
        [string]$Value = ""
    )

    $entry = @{
        timestamp = $timestamp
        step = $Step
        result = $Result
        value = $Value
    } | ConvertTo-Json

    Add-Content -Path "day1-results.log" -Value $entry
}

# Main script

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor $Colors.Cyan
Write-Host "║ CIE Day 1 Staging Deployment - START  ║" -ForegroundColor $Colors.Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor $Colors.Cyan
Write-Host ""
Write-Host "Date: $timestamp" -ForegroundColor $Colors.Cyan
Write-Host "Duration: 24 hours" -ForegroundColor $Colors.Cyan
Write-Host "Objective: Validate all systems on staging" -ForegroundColor $Colors.Cyan
Write-Host ""

# ============ PRE-FLIGHT ============
Write-Section "STEP 1-6: PRE-FLIGHT CHECKS"

# Step 1: Git status
Write-Host "Checking git status..." -ForegroundColor $Colors.Blue
$gitStatus, $result = Test-Command "git status"
if ($gitStatus) {
    $clean = $result -like "*nothing to commit*"
    if ($clean) {
        Write-Status "Git status: Clean" "ok"
        Log-Result "git-status" "PASS"
    } else {
        Write-Status "Git status: Has uncommitted changes" "fail"
        Write-Host $result
        Log-Result "git-status" "FAIL"
        exit 1
    }
} else {
    Write-Status "Git status: Error" "fail"
    Log-Result "git-status" "ERROR"
    exit 1
}

# Step 2: Branch verification
Write-Host "Checking branch..." -ForegroundColor $Colors.Blue
$branchCmd, $branch = Test-Command "git rev-parse --abbrev-ref HEAD"
if ($branchCmd) {
    Write-Status "Branch: $($branch.Trim())" "ok"
    Log-Result "git-branch" "PASS" $($branch.Trim())
}

# Step 3: Latest commit
Write-Host "Checking latest commit..." -ForegroundColor $Colors.Blue
$commitCmd, $commit = Test-Command "git log -1 --oneline"
if ($commitCmd) {
    Write-Host "Latest commit: $commit" -ForegroundColor $Colors.Green
    Log-Result "git-commit" "PASS" $commit
}

Wait-ForKey

# Step 4: Node version
Write-Host "Checking Node.js version..." -ForegroundColor $Colors.Blue
$nodeCmd, $nodeVer = Test-Command "node --version"
if ($nodeCmd) {
    Write-Status "Node version: $($nodeVer.Trim())" "ok"
    Log-Result "node-version" "PASS" $($nodeVer.Trim())
}

# Step 5: Env file
Write-Host "Checking .env.local..." -ForegroundColor $Colors.Blue
if (Test-Path ".env.local") {
    Write-Status ".env.local exists" "ok"
    Log-Result "env-file" "PASS"
} else {
    Write-Status ".env.local missing" "fail"
    Log-Result "env-file" "FAIL"
    exit 1
}

Wait-ForKey

# ============ BUILD & TEST ============
Write-Section "STEP 7-10: BUILD & VALIDATION"

# Build
Write-Host "Building project..." -ForegroundColor $Colors.Blue
$startBuild = Get-Date
$buildCmd, $buildResult = Test-Command "npm run build"
$buildTime = (Get-Date) - $startBuild

if ($buildCmd) {
    if ($buildResult -like "*error*") {
        Write-Status "Build failed" "fail"
        Write-Host $buildResult | Select-Object -Last 20
        Log-Result "build" "FAIL" "$($buildTime.TotalSeconds)s"
        exit 1
    } else {
        Write-Status "Build successful" "ok"
        Write-Host "Build time: $($buildTime.TotalSeconds) seconds" -ForegroundColor $Colors.Green
        Log-Result "build" "PASS" "$($buildTime.TotalSeconds)s"
    }
} else {
    Write-Status "Build error" "fail"
    Log-Result "build" "ERROR"
    exit 1
}

Wait-ForKey

# Test
Write-Host "Running test suite..." -ForegroundColor $Colors.Blue
$testCmd, $testResult = Test-Command "npm run test"
if ($testCmd) {
    if ($testResult -like "*failed*" -or $testResult -like "*FAIL*") {
        Write-Status "Tests failed" "fail"
        Write-Host $testResult | Select-Object -Last 30
        Log-Result "test" "FAIL"
        exit 1
    } else {
        Write-Status "Tests passed" "ok"
        Log-Result "test" "PASS"
    }
}

Wait-ForKey

# Lint
Write-Host "Running linter..." -ForegroundColor $Colors.Blue
$lintCmd, $lintResult = Test-Command "npm run lint"
if ($lintCmd) {
    Write-Status "Linting complete" "ok"
    Log-Result "lint" "PASS"
}

Wait-ForKey

# TypeScript
Write-Host "Running TypeScript check..." -ForegroundColor $Colors.Blue
$tsCmd, $tsResult = Test-Command "npx tsc --noEmit"
if ($tsCmd) {
    if ($tsResult -like "*error*") {
        Write-Status "TypeScript errors found" "fail"
        Log-Result "typescript" "FAIL"
        exit 1
    } else {
        Write-Status "TypeScript check passed" "ok"
        Log-Result "typescript" "PASS"
    }
}

Wait-ForKey

# ============ DEPLOYMENT ============
Write-Section "STEP 11: DEPLOY TO STAGING"

Write-Host "Ready to deploy to staging?" -ForegroundColor $Colors.Yellow
Write-Host "This will deploy to: https://cie-staging.vercel.app" -ForegroundColor $Colors.Yellow
$response = Read-Host "Proceed? (yes/no)"

if ($response -ne "yes") {
    Write-Status "Deployment cancelled" "fail"
    Log-Result "deploy" "CANCELLED"
    exit 0
}

Write-Host ""
Write-Host "Deploying to staging..." -ForegroundColor $Colors.Blue
$deployCmd, $deployResult = Test-Command "vercel deploy --env staging"

if ($deployCmd) {
    Write-Status "Deployment complete" "ok"
    Write-Host $deployResult | Select-Object -Last 10
    Log-Result "deploy" "PASS"
} else {
    Write-Status "Deployment failed" "fail"
    Log-Result "deploy" "FAIL"
    exit 1
}

Wait-ForKey

# ============ VERIFICATION ============
Write-Section "STEP 12-14: VERIFICATION"

$stagingUrl = "https://cie-staging.vercel.app"

Write-Host "Testing health endpoint..." -ForegroundColor $Colors.Blue
try {
    $health = Invoke-WebRequest "$stagingUrl/health" -UseBasicParsing
    if ($health.StatusCode -eq 200) {
        Write-Status "Health check: 200 OK" "ok"
        Log-Result "health-check" "PASS"
    } else {
        Write-Status "Health check: $($health.StatusCode)" "fail"
        Log-Result "health-check" "FAIL"
    }
} catch {
    Write-Status "Health check failed" "fail"
    Log-Result "health-check" "ERROR"
}

Wait-ForKey

# ============ MONITORING ============
Write-Section "STEP 15: START MONITORING"

Write-Host "Making deploy-monitor.sh executable..." -ForegroundColor $Colors.Blue
$chmodCmd, $result = Test-Command "chmod +x scripts/deploy-monitor.sh"
if ($chmodCmd) {
    Write-Status "Script executable" "ok"
}

Write-Host ""
Write-Host "Run this command to start monitoring:" -ForegroundColor $Colors.Yellow
Write-Host "./scripts/deploy-monitor.sh staging monitoring" -ForegroundColor $Colors.Cyan

Write-Host ""
Write-Host "In another terminal/window, this will:" -ForegroundColor $Colors.Yellow
Write-Host "- Check health every 15 seconds" -ForegroundColor $Colors.Yellow
Write-Host "- Test API endpoints" -ForegroundColor $Colors.Yellow
Write-Host "- Collect performance metrics" -ForegroundColor $Colors.Yellow
Write-Host "- Alert on issues" -ForegroundColor $Colors.Yellow

Wait-ForKey

# ============ FINAL SUMMARY ============
Write-Section "DAY 1 PRE-FLIGHT COMPLETE"

Write-Host "✅ All pre-flight checks passed!" -ForegroundColor $Colors.Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor $Colors.Cyan
Write-Host "1. Notify testing team to begin 24-hour validation" -ForegroundColor $Colors.Cyan
Write-Host "2. Start monitoring script (see above)" -ForegroundColor $Colors.Cyan
Write-Host "3. Follow DEPLOYMENT_DAILY_CHECKLIST.md for hourly checks" -ForegroundColor $Colors.Cyan
Write-Host "4. Document all test results" -ForegroundColor $Colors.Cyan
Write-Host "5. Collect performance metrics every 4 hours" -ForegroundColor $Colors.Cyan
Write-Host ""
Write-Host "Staging URL: $stagingUrl" -ForegroundColor $Colors.Cyan
Write-Host "Monitoring will log to: day1-results.log" -ForegroundColor $Colors.Cyan
Write-Host "Test Duration: 24 hours" -ForegroundColor $Colors.Cyan
Write-Host ""

Write-Host "Results logged to: day1-results.log" -ForegroundColor $Colors.Green
Write-Host ""
Write-Host "🎉 DAY 1 PRE-FLIGHT COMPLETE!" -ForegroundColor $Colors.Green
