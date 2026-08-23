# ============================================================================
# HRMASTER PRO - REST API BACKEND SERVER FOR SQL SERVER QLNHANSU (WITH TAI_KHOAN)
# ============================================================================

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Web

$connStr = "Server=localhost;Database=QLNHANSU;Trusted_Connection=True;Encrypt=False;"

function Query-Sql {
    param([string]$query)
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $query
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    $adapter.Fill($dt) | Out-Null
    $conn.Close()
    
    $list = @()
    foreach ($row in $dt.Rows) {
        $dict = [ordered]@{}
        foreach ($col in $dt.Columns) {
            $val = $row[$col.ColumnName]
            if ($val -eq [DBNull]::Value) { 
                $val = $null 
            }
            elseif ($val -is [System.DateTime] -or $val -is [System.DateTimeOffset]) {
                $val = $val.ToString("yyyy-MM-dd")
            }
            $dict[$col.ColumnName] = $val
        }
        $list += [PSCustomObject]$dict
    }
    return $list
}

function Execute-Sql {
    param([string]$query)
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $query
    $res = $cmd.ExecuteNonQuery()
    $conn.Close()
    return $res
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:5000/")
$listener.Start()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "HRMASTER PRO SQL BACKEND API SERVER IS RUNNING ON PORT 5000" -ForegroundColor Green
Write-Host "Connected Database: SQL Server [QLNHANSU] Table [tai_khoan]" -ForegroundColor Yellow
Write-Host "Listening for HTTP requests at http://localhost:5000/..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        $response.ContentType = "application/json; charset=utf-8"

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $rawUrl = $request.Url.AbsolutePath.TrimEnd('/')
        $method = $request.HttpMethod
        $jsonResult = "[]"

        $body = ""
        if ($request.HasEntityBody) {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $reader.Close()
        }

        if ($rawUrl -eq "/api/tai_khoan") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM tai_khoan") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/login") {
            if ($method -eq "POST") {
                $d = $body | ConvertFrom-Json
                $email = $d.email
                $pass = $d.mat_khau
                $users = Query-Sql "SELECT t.*, n.ho, n.ten FROM tai_khoan t LEFT JOIN nhan_vien n ON t.nhan_vien_id = n.nhan_vien_id WHERE t.email = '$email' AND t.mat_khau = '$pass'"
                if ($users.Count -gt 0) {
                    $jsonResult = $users[0] | ConvertTo-Json -Depth 5
                } else {
                    $response.StatusCode = 401
                    $jsonResult = '{"error":"Login failed"}'
                }
            }
        }
        elseif ($rawUrl -eq "/api/register") {
            if ($method -eq "POST") {
                try {
                    $d = $body | ConvertFrom-Json
                    $email = $d.email
                    $pass = $d.mat_khau
                    $role = $d.vai_tro
                    $ho = $d.ho
                    $ten = $d.ten
                    $phone = $d.so_dien_thoai

                    $existingTK = Query-Sql "SELECT * FROM tai_khoan WHERE email = '$email'"
                    $existingNV = Query-Sql "SELECT * FROM nhan_vien WHERE email = '$email'"

                    if ($existingTK.Count -gt 0) {
                        # Update role & password if account already registered
                        $empId = $existingTK[0].nhan_vien_id
                        Execute-Sql "UPDATE tai_khoan SET mat_khau = '$pass', vai_tro = '$role' WHERE email = '$email'"
                        if ($existingNV.Count -gt 0) {
                            Execute-Sql "UPDATE nhan_vien SET ho = N'$ho', ten = N'$ten', so_dien_thoai = '$phone' WHERE email = '$email'"
                        }
                    } elseif ($existingNV.Count -gt 0) {
                        # Link existing employee to new account
                        $empId = $existingNV[0].nhan_vien_id
                        Execute-Sql "UPDATE nhan_vien SET ho = N'$ho', ten = N'$ten', so_dien_thoai = '$phone' WHERE email = '$email'"
                        Execute-Sql "INSERT INTO tai_khoan (email, mat_khau, vai_tro, nhan_vien_id) VALUES ('$email', '$pass', '$role', '$empId')"
                    } else {
                        # Create brand new employee and account
                        $empId = [Guid]::NewGuid().ToString()
                        $code = "NV" + (Get-Random -Min 100 -Max 999)
                        $today = (Get-Date).ToString("yyyy-MM-dd")

                        Execute-Sql "INSERT INTO nhan_vien (nhan_vien_id, ma_nhan_vien, ho, ten, email, so_dien_thoai, phong_ban_id, chuc_danh_id, ngay_vao_lam, trang_thai) VALUES ('$empId', '$code', N'$ho', N'$ten', '$email', '$phone', 1, 1, '$today', 'DANG_LAM')"
                        Execute-Sql "INSERT INTO tai_khoan (email, mat_khau, vai_tro, nhan_vien_id) VALUES ('$email', '$pass', '$role', '$empId')"
                        Execute-Sql "INSERT INTO luong_hop_dong (nhan_vien_id, luong_co_ban, ngay_ap_dung) VALUES ('$empId', 20000000, '$today')"
                        Execute-Sql "INSERT INTO quy_phep_nam (nhan_vien_id, nam, tong_phep_nam) VALUES ('$empId', 2026, 12)"
                    }

                    $jsonResult = '{"status":"registered_success","email":"' + $email + '","vai_tro":"' + $role + '"}'
                } catch {
                    $response.StatusCode = 500
                    $jsonResult = '{"error":"' + $_.Exception.Message.Replace('"', '`"') + '"}'
                }
            }
        }
        elseif ($rawUrl -eq "/api/phong_ban") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM phong_ban") | ConvertTo-Json -Depth 5
            } elseif ($method -eq "POST") {
                $data = $body | ConvertFrom-Json
                Execute-Sql "INSERT INTO phong_ban (ten_phong_ban, ma_phong_ban, phong_ban_cha_id) VALUES (N'$($data.ten_phong_ban)', '$($data.ma_phong_ban)', $(if ($data.phong_ban_cha_id) { $data.phong_ban_cha_id } else { 'NULL' }))"
                $jsonResult = '{"status":"ok"}'
            }
        }
        elseif ($rawUrl -eq "/api/chuc_danh") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM chuc_danh") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/nhan_vien") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM nhan_vien") | ConvertTo-Json -Depth 5
            } elseif ($method -eq "POST") {
                $d = $body | ConvertFrom-Json
                $id = [Guid]::NewGuid().ToString()
                Execute-Sql "INSERT INTO nhan_vien (nhan_vien_id, ma_nhan_vien, ho, ten, email, so_dien_thoai, phong_ban_id, chuc_danh_id, quan_ly_id, ngay_vao_lam, trang_thai) VALUES ('$id', '$($d.ma_nhan_vien)', N'$($d.ho)', N'$($d.ten)', '$($d.email)', '$($d.so_dien_thoai)', $($d.phong_ban_id), $($d.chuc_danh_id), $(if($d.quan_ly_id){"'$($d.quan_ly_id)'"}else{'NULL'}), '$($d.ngay_vao_lam)', '$($d.trang_thai)')"
                Execute-Sql "INSERT INTO tai_khoan (email, mat_khau, vai_tro, nhan_vien_id) VALUES ('$($d.email)', '123456', 'EMPLOYEE', '$id')"
                Execute-Sql "INSERT INTO luong_hop_dong (nhan_vien_id, luong_co_ban, ngay_ap_dung) VALUES ('$id', 15000000, '$($d.ngay_vao_lam)')"
                Execute-Sql "INSERT INTO quy_phep_nam (nhan_vien_id, nam, tong_phep_nam) VALUES ('$id', 2026, 12)"
                $jsonResult = '{"status":"ok"}'
            } elseif ($method -eq "DELETE") {
                $empId = $request.QueryString["id"]
                if ($empId) {
                    Execute-Sql "DELETE FROM nhan_vien WHERE nhan_vien_id = '$empId'"
                    $jsonResult = '{"status":"deleted"}'
                }
            }
        }
        elseif ($rawUrl -eq "/api/tin_tuyen_dung") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM tin_tuyen_dung") | ConvertTo-Json -Depth 5
            } elseif ($method -eq "POST") {
                $d = $body | ConvertFrom-Json
                Execute-Sql "INSERT INTO tin_tuyen_dung (tieu_de, phong_ban_id, mo_ta_cong_viec, so_luong_tuyen, muc_luong_du_kien, trang_thai, ngay_dang, ngay_het_han) VALUES (N'$($d.tieu_de)', $($d.phong_ban_id), N'$($d.mo_ta_cong_viec)', $($d.so_luong_tuyen), N'$($d.muc_luong_du_kien)', 'DANG_TIN', '$($d.ngay_dang)', '$($d.ngay_het_han)')"
                $jsonResult = '{"status":"ok"}'
            }
        }
        elseif ($rawUrl -eq "/api/ung_vien") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM ung_vien") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/ho_so_ung_tuyen") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM ho_so_ung_tuyen") | ConvertTo-Json -Depth 5
            } elseif ($method -eq "PUT") {
                $d = $body | ConvertFrom-Json
                Execute-Sql "UPDATE ho_so_ung_tuyen SET trang_thai = '$($d.trang_thai)' WHERE ho_so_id = $($d.ho_so_id)"
                $jsonResult = '{"status":"updated"}'
            }
        }
        elseif ($rawUrl -eq "/api/phong_van") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM phong_van") | ConvertTo-Json -Depth 5
            } elseif ($method -eq "PUT") {
                $d = $body | ConvertFrom-Json
                Execute-Sql "UPDATE phong_van SET ket_qua = '$($d.ket_qua)' WHERE phong_van_id = $($d.phong_van_id)"
                $jsonResult = '{"status":"updated"}'
            }
        }
        elseif ($rawUrl -eq "/api/khoa_hoc") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM khoa_hoc") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/lich_dao_tao") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM lich_dao_tao") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/dang_ky_dao_tao") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM dang_ky_dao_tao") | ConvertTo-Json -Depth 5
            } elseif ($method -eq "PUT") {
                $d = $body | ConvertFrom-Json
                Execute-Sql "UPDATE dang_ky_dao_tao SET trang_thai='HOAN_THANH', ma_chung_chi='$($d.ma_chung_chi)', ngay_cap_chung_chi='$($d.ngay_cap_chung_chi)', diem_so=90 WHERE dang_ky_id=$($d.dang_ky_id)"
                $jsonResult = '{"status":"cert_issued"}'
            }
        }
        elseif ($rawUrl -eq "/api/chu_ky_danh_gia") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM chu_ky_danh_gia") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/muc_tieu_danh_gia") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM muc_tieu_danh_gia") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/ket_qua_danh_gia") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM ket_qua_danh_gia") | ConvertTo-Json -Depth 5
            } elseif ($method -eq "PUT") {
                $d = $body | ConvertFrom-Json
                Execute-Sql "UPDATE ket_qua_danh_gia SET trang_thai='PHE_DUYET' WHERE danh_gia_id=$($d.danh_gia_id)"
                $jsonResult = '{"status":"approved"}'
            }
        }
        elseif ($rawUrl -eq "/api/luong_hop_dong") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM luong_hop_dong") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/ky_tinh_luong") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM ky_tinh_luong") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/phieu_luong") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM phieu_luong") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/quy_phep_nam") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM quy_phep_nam") | ConvertTo-Json -Depth 5
            }
        }
        elseif ($rawUrl -eq "/api/don_xin_nghi_phep") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM don_xin_nghi_phep") | ConvertTo-Json -Depth 5
            } elseif ($method -eq "POST") {
                $d = $body | ConvertFrom-Json
                Execute-Sql "INSERT INTO don_xin_nghi_phep (nhan_vien_id, loai_nghi_phep, ngay_bat_dau, ngay_ket_thuc, tong_so_ngay, ly_do, trang_thai) VALUES ('$($d.nhan_vien_id)', '$($d.loai_nghi_phep)', '$($d.ngay_bat_dau)', '$($d.ngay_ket_thuc)', $($d.tong_so_ngay), N'$($d.ly_do)', 'CHO_DUYET')"
                $jsonResult = '{"status":"ok"}'
            } elseif ($method -eq "PUT") {
                $d = $body | ConvertFrom-Json
                Execute-Sql "UPDATE don_xin_nghi_phep SET trang_thai='$($d.trang_thai)' WHERE don_nghi_id=$($d.don_nghi_id)"
                if ($d.trang_thai -eq 'DA_DUYET') {
                    Execute-Sql "UPDATE quy_phep_nam SET phep_nam_da_dung = phep_nam_da_dung + $($d.tong_so_ngay) WHERE nhan_vien_id = '$($d.nhan_vien_id)' AND nam = 2026"
                }
                $jsonResult = '{"status":"leave_updated"}'
            }
        }
        elseif ($rawUrl -eq "/api/vw_phan_tich_phong_ban") {
            if ($method -eq "GET") {
                $jsonResult = (Query-Sql "SELECT * FROM vw_phan_tich_phong_ban") | ConvertTo-Json -Depth 5
            }
        }

        if (-not $jsonResult) { $jsonResult = "[]" }
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonResult)
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
    } catch {
        Write-Host "API Error: $_" -ForegroundColor Red
    }
}
