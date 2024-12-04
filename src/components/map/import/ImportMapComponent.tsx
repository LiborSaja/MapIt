import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat } from "ol/proj";
import { Draw } from "ol/interaction";
import { Feature } from "ol";
import { Point, LineString } from "ol/geom";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import "./ImportMapComponent.css";

const ImportMapComponent: React.FC = () => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<Map | null>(null);
    const [lineSource, setLineSource] = useState<VectorSource | null>(null);
    const [pointSource, setPointSource] = useState<VectorSource | null>(null);
    const drawRef = useRef<Draw | null>(null);
    const [currentAction, setCurrentAction] = useState<string>("line");

    useEffect(() => {
        if (!mapRef.current) return;

        const vectorSource = new VectorSource();
        const pointSource = new VectorSource();

        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: new Style({
                stroke: new Stroke({
                    color: "blue",
                    width: 3,
                }),
            }),
        });

        const pointLayer = new VectorLayer({
            source: pointSource,
            style: new Style({
                image: new Circle({
                    radius: 6,
                    fill: new Fill({ color: "red" }),
                    stroke: new Stroke({ color: "white", width: 2 }),
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
                pointLayer,
            ],
            view: new View({
                center: fromLonLat([16.626263, 49.197547]),
                zoom: 12,
            }),
        });

        setMap(mapObject);
        setLineSource(vectorSource);
        setPointSource(pointSource);

        return () => {
            mapObject.setTarget(undefined);
        };
    }, []);

    useEffect(() => {
        if (!map || !lineSource || !pointSource) return;

        const drawInteraction = new Draw({
            source: lineSource,
            type: "LineString",
        });

        map.addInteraction(drawInteraction);
        drawRef.current = drawInteraction;

        drawInteraction.on("drawend", (event) => {
            const geometry = event.feature.getGeometry() as LineString;
            if (geometry) {
                const coordinates = geometry.getCoordinates() as [
                    number,
                    number
                ][];
                updateVertices(coordinates);
            }
        });

        const handleRightClick = (event: MouseEvent) => {
            event.preventDefault();
            if (drawRef.current) {
                drawRef.current.finishDrawing();
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
    }, [map, lineSource, pointSource]);

    const updateVertices = (coordinates: [number, number][]) => {
        if (!pointSource) return;

        // Vyčištění předchozích bodů
        pointSource.clear();

        // Přidání bodů
        coordinates.forEach((coord, index) => {
            const pointFeature = new Feature({
                geometry: new Point(coord),
            });

            pointFeature.setStyle(
                new Style({
                    image: new Circle({
                        radius:
                            index === 0 || index === coordinates.length - 1
                                ? 8
                                : 6,
                        fill: new Fill({
                            color:
                                index === 0
                                    ? "green"
                                    : index === coordinates.length - 1
                                    ? "red"
                                    : "yellow",
                        }),
                        stroke: new Stroke({ color: "white", width: 2 }),
                    }),
                })
            );

            pointSource.addFeature(pointFeature);
        });
    };

    return (
        <div>
            <div
                className="map-style"
                ref={mapRef}
                onContextMenu={(e) => e.preventDefault()}></div>

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
