import React from "react";
import { Link } from "react-router-dom";
import "./NavbarComponent.css";

const NavbarComponent: React.FC = () => {
    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <div className="container-fluid">
                {/* Logo */}
                <Link className="navbar-brand" to="/about">
                    <i className="bi bi-compass d-block"></i>
                </Link>

                {/* Tlačítko pro mobilní menu */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Menu */}
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav text-center">
                        <li className="nav-item">
                            <Link className="nav-link" to="/about">
                                <i className="bi bi-house-door-fill d-block"></i>
                                O aplikaci
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/guide">
                                <i className="bi bi-info-circle-fill d-block"></i>
                                Průvodce
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/map">
                                <i className="bi bi-map-fill d-block"></i>
                                Mapa
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default NavbarComponent;
