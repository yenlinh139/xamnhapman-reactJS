# Mapping thông tin trạm Nhà Bè

## Thông tin trạm theo tài liệu

### NB_TV - Nhà Bè (Thủy văn)

- **Tọa độ**: 106°44'05" | 10°38'22"
- **Loại**: Thủy văn
- **Thông số**: Mực nước, độ mặn nước sông
- **Thời gian**: 08/1980 - nay
- **Tần suất**: 24/24 (liên tục)

### NB_KT - Nhà Bè (Khí tượng)

- **Tọa độ**: 106°43'56" | 10°39'27"
- **Loại**: Khí tượng
- **Thông số**:
    - Bức xạ
    - Áp suất khí quyển
    - Gió bề mặt
    - Bốc hơi
    - Nhiệt độ không khí
    - Nhiệt độ đất
    - Nhiệt độ không khí và nhiệt độ mặt đất tối cao
    - Nhiệt độ không khí và nhiệt độ mặt đất tối thấp
    - Độ ẩm không khí
    - Mưa
    - Tầm nhìn xa
    - Hiện tượng khí tượng
    - Thời gian nắng
    - Mây
    - Thời tiết đã qua
    - Thời tiết hiện tại
    - Trạng thái mặt đất
- **Thời gian**: 11/2012 - nay (ngoại trừ mưa từ 1990 đến nay)
- **Tần suất**: 8 lần/ngày vào lúc 1, 4, 7, 10, 13, 16, 19, 22 giờ

## Mapping trong code

### 1. Hydrometeorology Data (Khí tượng thủy văn)

```javascript
// Rainfall parameters with station suffix _NB
R_NB: "Mưa Nhà Bè"; // Station: NB_KT

// Water level parameters with station suffix _NB
Htb_NB: "Mực nước TB Nhà Bè"; // Station: NB_TV
Hx_NB: "Mực nước Max Nhà Bè"; // Station: NB_TV
Hm_NB: "Mực nước Min Nhà Bè"; // Station: NB_TV

// Temperature parameters (likely from TSH - Tân Sơn Hòa, not Nhà Bè)
Ttb_TSH: "Nhiệt độ TB Tân Sơn Hòa";
Tx_TSH: "Nhiệt độ Max Tân Sơn Hòa";
Tm_TSH: "Nhiệt độ Min Tân Sơn Hòa";
```

### 2. Salinity Data (Độ mặn)

```javascript
MNB: "Mũi Nhà Bè"; // Station: NB_TV (thủy văn - có đo độ mặn)
```

## Lưu ý quan trọng

1. **Mực nước và độ mặn** đều từ trạm **NB_TV** (Thủy văn)
2. **Dữ liệu khí tượng** từ trạm **NB_KT** (Khí tượng)
3. **Nhiệt độ** có thể từ Tân Sơn Hòa (TSH) chứ không phải Nhà Bè
4. **Trạm độ mặn MNB** và **trạm mực nước \_NB** là cùng một trạm vật lý (NB_TV)

## Kiểm tra cần thiết

- [ ] Xác nhận tọa độ chính xác của từng trạm
- [ ] Đảm bảo mapping parameter với đúng trạm nguồn
- [ ] Kiểm tra tần suất thu thập dữ liệu phù hợp
- [ ] Xác minh thời gian hoạt động của từng trạm
