import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat } from "ol/proj";
import { Draw } from "ol/interaction";
import "./ImportMapComponent.css";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";

const ImportMapComponent: React.FC = () => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<Map | null>(null);
    const [lineSource, setLineSource] = useState<VectorSource | null>(null);
    const drawRef = useRef<Draw | null>(null);
    const [currentAction, setCurrentAction] = useState<string>("line");

    useEffect(() => {
        if (!mapRef.current) return;

        const vectorSource = new VectorSource();
        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: new Style({
                stroke: new Stroke({
                    color: "blue",
                    width: 3,
                }),
            }),
        });

        const mapObject = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                vectorLayer,
            ],
            view: new View({
                center: fromLonLat([16.626263, 49.197547]),
                zoom: 12,
            }),
        });

        setMap(mapObject);
        setLineSource(vectorSource);

        return () => {
            mapObject.setTarget(undefined);
        };
    }, []);

    useEffect(() => {
        if (!map || !lineSource) return;

        const drawInteraction = new Draw({
            source: lineSource,
            type: "LineString",
        });

        map.addInteraction(drawInteraction);
        drawRef.current = drawInteraction;

        // Listener na pravé kliknutí
        const handleRightClick = (event: MouseEvent) => {
            event.preventDefault();
            if (drawRef.current) {
                drawRef.current.finishDrawing(); // Ukončení kreslení
            }
        };

        map.getViewport().addEventListener("contextmenu", handleRightClick);

        return () => {
            map.removeInteraction(drawInteraction);
            map.getViewport().removeEventListener(
                "contextmenu",
                handleRightClick
            );
        };
    }, [map, lineSource]);

    return (
        <div>
            {/* Mapový kontejner */}
            <div
                className="map-style"
                ref={mapRef}
                onContextMenu={(e) => e.preventDefault()} // Zakázání kontextového menu
            ></div>

            {/* Tlačítka pro akce */}
            <div className="mt-3">
                <button
                    className={`btn btn-success me-2 ${
                        currentAction === "line" ? "active" : ""
                    }`}
                    onClick={() => setCurrentAction("line")}>
                    Přidat linii
                </button>
                <button
                    className={`btn btn-primary me-2 ${
                        currentAction === "move" ? "active" : ""
                    }`}
                    onClick={() => setCurrentAction("move")}>
                    Přemístit bod
                </button>
                <button
                    className={`btn btn-warning me-2 ${
                        currentAction === "delete" ? "active" : ""
                    }`}
                    onClick={() => setCurrentAction("delete")}>
                    Smazat linii
                </button>
                <button
                    className="btn btn-danger"
                    onClick={() => {
                        lineSource?.clear();
                    }}>
                    Smazat vše
                </button>
            </div>
        </div>
    );
};

export default ImportMapComponent;
