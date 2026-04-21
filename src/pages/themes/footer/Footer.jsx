import React from "react";
import logoDaiKTTVNamBo from "@assets/logo/DaiKTTVNamBo.png";
import logoDHNongLamTPHCM from "@assets/logo/DHNongLamTPHCM.png";
import logoOpenGIS from "@assets/logo/OpenGIS.png";
import loggoSoKHCNTPHCM from "@assets/logo/SoKHCNTPHCM.png";
import logoSoNTPTNTTPHM from "@assets/logo/SoNTPTNTTPHM.png";
import logoSoTNMTTPHCM from "@assets/logo/SoTNMTTPHCM.png";


function Footer() {
    const logos = [
        { src: loggoSoKHCNTPHCM, alt: "Sở Khoa học và Công nghệ TP. Hồ Chí Minh" },
        { src: logoDHNongLamTPHCM, alt: "Trường Đại học Nông Lâm TP. Hồ Chí Minh" },
        { src: logoOpenGIS, alt: "OpenGIS Việt Nam" },
        { src: logoSoNTPTNTTPHM, alt: "Sở Nông nghiệp và Phát triển Nông thôn TP. Hồ Chí Minh" },
        { src: logoSoTNMTTPHCM, alt: "Sở Tài nguyên và Môi trường TP. Hồ Chí Minh" },
        { src: logoDaiKTTVNamBo, alt: "Đài Khí tượng Thủy văn Khu vực Nam Bộ" },
    ];

    return (
        <div>
            <footer className="footer">
                <div className="container">
                    <div className="footer-logos">
                        {logos.map((logo, index) => (
                            <div key={index} className="footer-logo-item">
                                <img src={logo.src} alt={logo.alt} className="footer-logo" />
                            </div>
                        ))}
                    </div>

                    <div className="footer-content footer-content--compact">
                        <div className="footer-section footer-section--wide">
                            <h4>CƠ QUAN CHỦ QUẢN</h4>
                            <ul>
                                <li>Sở Khoa học và Công nghệ TP. Hồ Chí Minh</li>
                            </ul>
                        </div>

                        <div className="footer-section footer-section--wide">
                            <h4>CƠ QUAN THỰC HIỆN</h4>
                            <ul>
                                <li>Trường Đại học Nông Lâm TP. Hồ Chí Minh</li>
                                <li>OpenGIS Việt Nam</li>
                            </ul>
                        </div>

                        <div className="footer-section footer-section--wide">
                            <h4>CƠ QUAN PHỐI HỢP</h4>
                            <ul>
                                <li>Sở Nông nghiệp và Môi trường TP. Hồ Chí Minh</li>
                                <li>Đài Khí tượng Thủy văn Khu vực Nam Bộ</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </footer>
            <div className="bottom-home">
                <div className="container">
                    Copyright © 2026 | Bản quyền thuộc Trường Đại học Nông Lâm TP. Hồ Chí Minh
                </div>
            </div>
        </div>
    );
}

export default Footer;
