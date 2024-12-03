import { useState } from "react";
import { MapElement } from "../../../interfaces/Interface";
import { getAzimuthText } from "../../../services/GeometryService";
import "./InfoComponent.css";

const InfoComponent: React.FC = () => {
    const [elements, setElements] = useState<MapElement[]>([
        { id: "bod001", type: "point", lat: 28.123456, lon: 18.123456 },
        {
            id: "linie001",
            type: "line",
            azimuth: "58", // Číselná hodnota ve stupních
            distance: 800,
        },
        {
            id: "bod002",
            type: "point",
            lat: 28.884846,
            lon: 18.978944,
            angle: 30,
        },
        { id: "linie002", type: "line", azimuth: "90", distance: 1200 },
        { id: "bod003", type: "point", lat: 28.783251, lon: 18.365478 },
    ]);

    const [distanceUnit, setDistanceUnit] = useState<string>("kilometry");
    const [angleUnit, setAngleUnit] = useState<string>("stupně");

    return (
        <div className="info-container border p-3">
            {/* Nadpis */}
            <h2 className="mb-3">Parametry</h2>

            {/* Dropdowny pro jednotky */}
            <div className="mb-3">
                <label className="me-2">Jednotky:</label>
                <select
                    value={distanceUnit}
                    onChange={(e) => setDistanceUnit(e.target.value)}
                    className="form-select d-inline w-auto">
                    <option value="km">kilometry</option>
                    <option value="mil">míle</option>
                </select>
                <select
                    value={angleUnit}
                    onChange={(e) => setAngleUnit(e.target.value)}
                    className="form-select d-inline w-auto">
                    <option value="°">stupně</option>
                    <option value="rad">radiány</option>
                </select>
            </div>

            {/* Rolovatelná sekce */}
            <div className="scrollable-section">
                {elements.map((element) => (
                    <div key={element.id} className="mb-3">
                        {element.type === "point" ? (
                            <div>
                                <strong>{element.id}:</strong>
                                <div>
                                    lat:{" "}
                                    <input
                                        type="number"
                                        value={element.lat}
                                        className="form-control d-inline w-auto"
                                        readOnly
                                    />{" "}
                                    <br />
                                    lon:{" "}
                                    <input
                                        type="number"
                                        value={element.lon}
                                        className="form-control d-inline w-auto"
                                        readOnly
                                    />
                                </div>
                                {element.angle && (
                                    <div>
                                        vnitřní úhel: {element.angle}{" "}
                                        {angleUnit}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <strong>{element.id}:</strong>
                                <div>
                                    azimut: {element.azimuth}°{" "}
                                    {getAzimuthText(
                                        parseFloat(element.azimuth!)
                                    )}
                                    <br />
                                    vzdálenost: {element.distance}{" "}
                                    {distanceUnit}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InfoComponent;
