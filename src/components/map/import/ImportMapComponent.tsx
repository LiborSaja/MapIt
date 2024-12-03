import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat } from "ol/proj";
import { Style, Stroke, Circle, Fill } from "ol/style";
import { Feature } from "ol";
import { Point, LineString } from "ol/geom";
import "./ImportMapComponent.css";
import { Text } from "ol/style";

const ImportMapComponent: React.FC = () => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<Map | null>(null);
    const [lineSource, setLineSource] = useState<VectorSource | null>(null);
    const [pointSource, setPointSource] = useState<VectorSource | null>(null);
    const [currentAction, setCurrentAction] = useState<string>("line");
    const [drawingFeature, setDrawingFeature] = useState<Feature | null>(null);

    // ------------------------------------------------------------------------------------------------------Inicializace mapy
    useEffect(() => {
        if (!mapRef.current) return;

        // Vektorová vrstva pro linky
        const lineVectorSource = new VectorSource();
        const lineVectorLayer = new VectorLayer({
            source: lineVectorSource,
            style: new Style({
                stroke: new Stroke({
                    color: "blue",
                    width: 3,
                }),
            }),
        });

        // Vektorová vrstva pro body
        const pointVectorSource = new VectorSource();
        const pointVectorLayer = new VectorLayer({
            source: pointVectorSource,
            style: new Style({
                image: new Circle({
                    radius: 6,
                    fill: new Fill({ color: "red" }),
                    stroke: new Stroke({ color: "white", width: 2 }),
                }),
            }),
        });

        // Vytvoření mapy
        const mapObject = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                lineVectorLayer,
                pointVectorLayer,
            ],
            view: new View({
                center: fromLonLat([16.626263, 49.197547]), // Souřadnice Brna
                zoom: 12,
            }),
        });

        // Uložíme vrstvy do stavu
        setLineSource(lineVectorSource);
        setPointSource(pointVectorSource);

        // Uložíme mapu do stavu
        setMap(mapObject);

        return () => mapObject.setTarget(undefined);
    }, []);

    // ----------------------------------------------------------------------------------------------Funkce pro zahájení kreslení
    const handleMouseDown = (event: any) => {
        if (!map || !lineSource || event.button !== 2) return; // Kreslení pouze při pravém tlačítku

        const pixel = map.getEventPixel(event);
        const coordinate = map.getCoordinateFromPixel(pixel);

        // Vytvoříme novou linii se začátečním bodem
        const lineFeature = new Feature({
            geometry: new LineString([coordinate, coordinate]),
        });
        lineSource.addFeature(lineFeature);
        setDrawingFeature(lineFeature);

        // Zakázání kontextového menu při kreslení
        event.preventDefault();
    };

    // --------------------------------------------------------------------------------------Funkce pro aktualizaci kreslené linky
    const handleMouseMove = (event: any) => {
        // Kontrola, zda se kreslí pravým tlačítkem
        if (!map || !drawingFeature || event.buttons !== 2) return;

        const pixel = map.getEventPixel(event);
        const coordinate = map.getCoordinateFromPixel(pixel);

        // Získání existující geometrie linie
        const geometry = drawingFeature.getGeometry() as LineString;
        const startCoordinate = geometry.getFirstCoordinate(); // Začátek linky

        // Aktualizace linky: pouze dva body (start + aktuální pozice)
        geometry.setCoordinates([startCoordinate, coordinate]);
    };

    // ----------------------------------------------------------------------------------------------Funkce pro ukončení kreslení
    const handleMouseUp = (event: any) => {
        if (!map || !drawingFeature || !pointSource || event.button !== 2)
            return;

        const pixel = map.getEventPixel(event);
        const coordinate = map.getCoordinateFromPixel(pixel);

        // Přidáme body na začátku a na konci linie
        const geometry = drawingFeature.getGeometry() as LineString;
        const coordinates = geometry.getCoordinates();

        // Začátek linky
        const startPoint = new Feature({
            geometry: new Point(coordinates[0]),
        });
        startPoint.setStyle(
            new Style({
                image: new Circle({
                    radius: 6,
                    fill: new Fill({ color: "red" }),
                    stroke: new Stroke({ color: "white", width: 2 }),
                }),
                text: new Text({
                    text: "Start",
                    offsetY: -15, // Posun textu nad bod
                    fill: new Fill({ color: "black" }),
                    stroke: new Stroke({ color: "white", width: 2 }),
                }),
            })
        );

        // Konec linky
        const endPoint = new Feature({
            geometry: new Point(coordinate),
        });
        endPoint.setStyle(
            new Style({
                image: new Circle({
                    radius: 6,
                    fill: new Fill({ color: "red" }),
                    stroke: new Stroke({ color: "white", width: 2 }),
                }),
                text: new Text({
                    text: "Konec",
                    offsetY: -15, // Posun textu nad bod
                    fill: new Fill({ color: "black" }),
                    stroke: new Stroke({ color: "white", width: 2 }),
                }),
            })
        );

        pointSource.addFeatures([startPoint, endPoint]);

        // Ukončíme kreslení
        setDrawingFeature(null);
    };

    return (
        <div>
            {/* Mapový kontejner */}
            <div
                className="map-style"
                ref={mapRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
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
                        pointSource?.clear();
                    }}>
                    Smazat vše
                </button>
            </div>
        </div>
    );
};

export default ImportMapComponent;
