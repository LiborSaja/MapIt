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
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Text from "ol/style/Text";
import { Point, LineString } from "ol/geom";
import { Feature } from "ol";

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
        const pointVectorSource = new VectorSource();

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
            source: pointVectorSource,
            style: new Style({
                image: new Circle({
                    radius: 5,
                    fill: new Fill({ color: "yellow" }),
                    stroke: new Stroke({ color: "white", width: 1 }),
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
        setPointSource(pointVectorSource);

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

        // Listener na ukončení kreslení
        drawInteraction.on("drawend", (event) => {
            const geometry = event.feature.getGeometry() as LineString; // Přetypování na LineString
            if (geometry?.getType() === "LineString") {
                const coordinates = geometry.getCoordinates() as [
                    number,
                    number
                ][];

                // Přidání bodů na začátek a konec
                const startFeature = new Feature({
                    geometry: new Point(coordinates[0]),
                });
                const endFeature = new Feature({
                    geometry: new Point(coordinates[coordinates.length - 1]),
                });

                // Styl "start" a "konec"
                startFeature.setStyle(
                    new Style({
                        image: new Circle({
                            radius: 5,
                            fill: new Fill({ color: "green" }),
                            stroke: new Stroke({ color: "white", width: 1 }),
                        }),
                        text: new Text({
                            text: "start",
                            font: "12px Arial",
                            fill: new Fill({ color: "black" }),
                            stroke: new Stroke({ color: "white", width: 2 }),
                            offsetY: -10, // Umístění nad bod
                        }),
                    })
                );

                endFeature.setStyle(
                    new Style({
                        image: new Circle({
                            radius: 5,
                            fill: new Fill({ color: "red" }),
                            stroke: new Stroke({ color: "white", width: 1 }),
                        }),
                        text: new Text({
                            text: "konec",
                            font: "12px Arial",
                            fill: new Fill({ color: "black" }),
                            stroke: new Stroke({ color: "white", width: 2 }),
                            offsetY: -10, // Umístění nad bod
                        }),
                    })
                );

                pointSource.addFeatures([startFeature, endFeature]);

                // Přidání žlutých bodů na zlomy
                coordinates.slice(1, -1).forEach((coord) => {
                    const middleFeature = new Feature({
                        geometry: new Point(coord),
                    });

                    middleFeature.setStyle(
                        new Style({
                            image: new Circle({
                                radius: 5,
                                fill: new Fill({ color: "yellow" }),
                                stroke: new Stroke({
                                    color: "white",
                                    width: 1,
                                }),
                            }),
                        })
                    );

                    pointSource.addFeature(middleFeature);
                });
            }
        });

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
    }, [map, lineSource, pointSource]);

    return (
        <div>
            <div
                className="map-style"
                ref={mapRef}
                onContextMenu={(e) => e.preventDefault()} // Zakázání kontextového menu
            ></div>

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
