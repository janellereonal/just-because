param(
    [Parameter(Mandatory = $true)]
    [string]$SiteRoot,

    [string]$BindAddress = "0.0.0.0",

    [ValidateRange(1, 65535)]
    [int]$Port = 8088
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $SiteRoot).Path
$rootPrefix = $resolvedRoot.TrimEnd("\") + "\"
$mimeTypes = @{
    ".css" = "text/css; charset=utf-8"
    ".html" = "text/html; charset=utf-8"
    ".ico" = "image/x-icon"
    ".jpeg" = "image/jpeg"
    ".jpg" = "image/jpeg"
    ".js" = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png" = "image/png"
    ".svg" = "image/svg+xml"
    ".txt" = "text/plain; charset=utf-8"
    ".webp" = "image/webp"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
}

$listener = [System.Net.Sockets.TcpListener]::new(
    [System.Net.IPAddress]::Parse($BindAddress),
    $Port
)
$listener.Start()
Write-Host "Serving $resolvedRoot on http://$BindAddress`:$Port. Press Ctrl+C to stop."

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $stream.ReadTimeout = 5000
            $reader = [System.IO.StreamReader]::new(
                $stream,
                [System.Text.Encoding]::ASCII,
                $false,
                1024,
                $true
            )

            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                continue
            }

            $requestParts = $requestLine -split "\s+"
            $method = $requestParts[0]
            if ($requestParts.Count -lt 2 -or $method -notin @("GET", "HEAD")) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed.")
                $headers = "HTTP/1.1 405 Method Not Allowed`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($body, 0, $body.Length)
                continue
            }

            while ($true) {
                $headerLine = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($headerLine)) {
                    break
                }
            }

            try {
                $requestUri = [System.Uri]::new("http://localhost$($requestParts[1])")
                $relativePath = [System.Uri]::UnescapeDataString($requestUri.AbsolutePath.TrimStart("/"))
                if ([string]::IsNullOrEmpty($relativePath)) {
                    $relativePath = "index.html"
                }

                $relativePath = $relativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
                $filePath = [System.IO.Path]::GetFullPath((Join-Path $resolvedRoot $relativePath))
                if (-not $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                    $status = "403 Forbidden"
                    $body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden.")
                    $contentType = "text/plain; charset=utf-8"
                }
                else {
                    if (Test-Path -LiteralPath $filePath -PathType Container) {
                        $filePath = Join-Path $filePath "index.html"
                    }
                    elseif (-not (Test-Path -LiteralPath $filePath -PathType Leaf) -and
                        (Test-Path -LiteralPath "$filePath.html" -PathType Leaf)) {
                        $filePath = "$filePath.html"
                    }

                    if (Test-Path -LiteralPath $filePath -PathType Leaf) {
                        $status = "200 OK"
                        $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
                        $contentType = $mimeTypes[$extension]
                        if (-not $contentType) {
                            $contentType = "application/octet-stream"
                        }
                        $body = [System.IO.File]::ReadAllBytes($filePath)
                    }
                    else {
                        $status = "404 Not Found"
                        $body = [System.Text.Encoding]::UTF8.GetBytes("Not found.")
                        $contentType = "text/plain; charset=utf-8"
                    }
                }
            }
            catch {
                $status = "400 Bad Request"
                $body = [System.Text.Encoding]::UTF8.GetBytes("Bad request.")
                $contentType = "text/plain; charset=utf-8"
            }

            $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`nReferrer-Policy: no-referrer`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            if ($method -eq "GET" -and $body.Length -gt 0) {
                $stream.Write($body, 0, $body.Length)
            }
        }
        catch {
            Write-Warning "A client request could not be served."
        }
        finally {
            $client.Close()
        }
    }
}
finally {
    $listener.Stop()
}
