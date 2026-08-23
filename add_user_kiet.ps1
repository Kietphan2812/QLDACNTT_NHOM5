# ============================================================================
# ADD USER KIETPHAN2812@GMAIL.COM TO SQL SERVER QLNHANSU
# ============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$connStr = "Server=localhost;Database=QLNHANSU;Trusted_Connection=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)

try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
IF NOT EXISTS (SELECT * FROM tai_khoan WHERE email='kietphan2812@gmail.com')
BEGIN
    DECLARE @newid UNIQUEIDENTIFIER = NEWID();
    INSERT INTO nhan_vien (nhan_vien_id, ma_nhan_vien, ho, ten, email, so_dien_thoai, phong_ban_id, chuc_danh_id, ngay_vao_lam, trang_thai) 
    VALUES (@newid, 'NV008', N'Phan', N'Văn Kiệt', 'kietphan2812@gmail.com', '0989111222', 1, 1, '2026-01-01', 'DANG_LAM');

    INSERT INTO tai_khoan (email, mat_khau, vai_tro, nhan_vien_id) 
    VALUES ('kietphan2812@gmail.com', '123456', 'ADMIN', @newid);
END
"@
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "REGISTERED kietphan2812@gmail.com IN SQL SERVER SUCCESSFULLY!" -ForegroundColor Green
    $conn.Close()
} catch {
    Write-Host "Error registering user: $_" -ForegroundColor Red
}
