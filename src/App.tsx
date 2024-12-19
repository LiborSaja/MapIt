import React from "react";
import {
    HashRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import NavbarComponent from "./components/navbar/NavbarComponent";
import MapComponent from "./components/map/MapComponent";
import AboutComponent from "./components/about/AboutComponent";
import GuideComponent from "./components/guide/GuideComponent";

const App: React.FC = () => {
    return (
        <Router>
            <div className="container-fluid">
                {/* navigační menu */}
                <div className="row">
                    <div className="col">
                        <NavbarComponent />
                    </div>
                </div>

                {/* obsah řízený react routerem */}
                <Routes>
                    {/* stránky */}
                    <Route
                        path="/index.html"
                        element={<Navigate to="/" replace />}
                    />
                    <Route
                        path="/"
                        element={<Navigate to="/about" replace />}
                    />
                    <Route path="/about" element={<AboutComponent />} />
                    <Route path="/guide" element={<GuideComponent />} />
                    <Route path="/map" element={<MapComponent />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
