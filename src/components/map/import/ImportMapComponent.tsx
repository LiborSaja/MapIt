import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Feature, Map, MapBrowserEvent, Overlay, View } from "ol";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Draw, Modify } from "ol/interaction";
import { Geometry, LineString, Point } from "ol/geom";
import { Coordinate } from "ol/coordinate";
import { fromLonLat } from "ol/proj";
import "./ImportMapComponent.css";
import { altKeyOnly } from "ol/events/condition";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import Text from "ol/style/Text";
import RegularShape from "ol/style/RegularShape";
import { defaults as defaultControls } from "ol/control";
import { defaults as defaultInteractions } from "ol/interaction";
import { SegmentData, LineData } from "../../../interfaces/Interface";
import {
    calculateAllProperties,
    convertDistance,
    convertAngle,
    transformCoordinate,
    calculateTotalLength,
} from "../../../services/CalculationsService";

const ImportMapComponent: React.FC = () => {
    //--------------------------------------------------------------------------------------------------------- useRef deklarace
    //připojení mapy OL na existující <div> v DOM
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    //reference na vektorový zdroj, který obsahuje všechny prvky (např. polyčáry a štítky) vykreslené na mapě
    const vectorSourceRef = useRef<VectorSource | null>(null);
    //reference na odstraňovací popup
    const popupRef = useRef<HTMLDivElement | null>(null);

    //------------------------------------------------------------------------------------------------------- useState deklarace
    //uchování dat a aktualizace všech polyčar a jejich segmentů v poli typu LineData
    const [segmentData, setSegmentData] = useState<LineData[]>([]);
    //pro výpočtech délky a zobrazení v tabulce
    const [distanceUnit, setDistanceUnit] = useState<"km" | "mil">("km");
    //pro výpočet a zobrazení azimutů a úhlů segmentů
    const [angleUnit, setAngleUnit] = useState<"°" | "rad">("°");
    //pro podmíněné zobrazení štítků na základě uživatelské volby
    const [showInfoLabels, setShowInfoLabels] = useState(true);
    //pro zobrazení/skrytí pop-up tooltipu po kliknutí na ikonu nápovědy
    const [showTooltip, setShowTooltip] = useState(false);
    //pro statický obsah popupu
    const [popupContent] = useState<string>("");
    //pro četnost nakreslených polyčar a generování unikátních identifikátorů
    let polylineCounter = 0;

    //vyčištění vektorového zdroje mapy a resetování dat v tabulce
    const clearAllFeatures = () => {
        if (vectorSourceRef.current) {
            vectorSourceRef.current.clear();
        }
        setSegmentData([]);
    };

    //-------------------------------------------------------------------------------------------------------------- useEffect()
    //k inicializaci mapy OpenLayers a souvisejících interakcí, nastavení logiky kreslení a modifikace polylinií, a ke správě
    //popupů a event listenerů

    useEffect(() => {
        //kontrola že mapa nebude inicializována, dokud není DOM element k dispozici
        if (!mapContainerRef.current) return;

        //instance, která umožňuje vytvářet vektorové vrstvy a její uchování do useRef pro to, aby nedošlo k re-renderu
        const vectorSource = new VectorSource();
        vectorSourceRef.current = vectorSource;

        //instance Overlay pro umístění HTML elementů nad mapou na určité souřadnice
        const popup = new Overlay({
            element: popupRef.current!,
            positioning: "bottom-center",
            stopEvent: false,
        });

        //inicializace mapy - nastavuje cílový html element, vrstvy mapy, pohled na mapu, překryvy, ovládací prvky, interakce
        const map = new Map({
            target: mapContainerRef.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                new VectorLayer({
                    source: vectorSource,
                    style: new Style({
                        stroke: new Stroke({
                            color: "blue",
                            width: 4,
                        }),
                    }),
                }),
            ],
            view: new View({
                center: fromLonLat([16.626263, 49.197547]),
                zoom: 12,
            }),
            overlays: [popup],
            controls: defaultControls(),
            interactions: defaultInteractions({ onFocusOnly: false }),
        });

        //vlastní podmínka pro Ctrl + Levé tlačítko myši
        const ctrlAndLeftMouseCondition = (
            event: MapBrowserEvent<UIEvent>
        ): boolean => {
            const originalEvent = event.originalEvent as MouseEvent;
            return originalEvent.ctrlKey && originalEvent.button === 0;
        };

        //vytvoření interakce pro kreslení
        const drawInteraction = new Draw({
            source: vectorSource,
            type: "LineString",
            condition: ctrlAndLeftMouseCondition,
            style: new Style({
                stroke: new Stroke({
                    color: "blue",
                    width: 4,
                }),
            }),
        });
        map.addInteraction(drawInteraction);

        //vytvoření interakce pro modifikaci
        const modifyInteraction = new Modify({
            source: vectorSource,
            condition: altKeyOnly,
        });
        map.addInteraction(modifyInteraction);

        //metoda pro vytvoření štítků start a konec
        const createStartEndLabels = (
            lineString: LineString,
            polylineId: string
        ) => {
            //výstup metody pro štítky start a konec jako pole prvků
            const features: Feature<Point>[] = [];

            //kontrola délky polylinie - pokud obsahuje méně jak 2 body, štítky se nevytvoří
            const coordinates = lineString.getCoordinates();
            if (coordinates.length < 2) {
                return features;
            }

            //začáteční štítek polylinie - souřadnice prvního bodu, instance Feature, styl štítku, nastavení vlastností
            if (lineString.getFirstCoordinate()) {
                const startFeature = new Feature({
                    geometry: new Point(lineString.getFirstCoordinate()),
                });
                startFeature.setStyle(
                    new Style({
                        text: new Text({
                            text: "Start",
                            font: "12px Calibri,sans-serif",
                            fill: new Fill({ color: "white" }),
                            backgroundFill: new Fill({ color: "green" }),
                            padding: [3, 3, 3, 3],
                            offsetY: -10,
                        }),
                    })
                );
                startFeature.set("isLabel", true); //přidání štítku start
                startFeature.set("polylineId", polylineId); //přidání ID polylinie
                features.push(startFeature); //přidání štítku do seznamu prvků
            }

            //koncový štítek polylinie - podobné předchozímu
            if (lineString.getLastCoordinate()) {
                const endFeature = new Feature({
                    geometry: new Point(lineString.getLastCoordinate()),
                });
                endFeature.setStyle(
                    new Style({
                        text: new Text({
                            text: "Konec",
                            font: "12px Calibri,sans-serif",
                            fill: new Fill({ color: "white" }),
                            backgroundFill: new Fill({ color: "red" }),
                            padding: [3, 3, 3, 3],
                            offsetY: -10,
                        }),
                    })
                );
                endFeature.set("isLabel", true);
                endFeature.set("polylineId", polylineId);
                features.push(endFeature);
            }

            //vracení pole
            return features;
        };

        //metoda pro vytvoření štítků, které obsahují název polylinie, název individuální linie a její ID
        const createSegmentLabels = (
            lineString: LineString,
            polylineName: string,
            polylineId: string
        ) => {
            //výstup metody jako pole štítků individuálních linií polylinie
            const labelFeatures: Feature<Point>[] = [];
            let segmentNumber = 1;

            //iterace přes všechny segmenty polylinie, kde je každý segment definován dvojicí bodů start a end
            lineString.forEachSegment((start, end) => {
                const segment = new LineString([start, end]);
                const midPoint = segment.getCoordinateAt(0.5);

                //instance prvku pro umístění štítku uprostřed každé individuální linie
                const labelFeature = new Feature({
                    geometry: new Point(midPoint),
                });

                //styl štítku, RegularShape pro špičku štítku
                labelFeature.setStyle(
                    new Style({
                        text: new Text({
                            text: `${polylineName}\nLinie ${segmentNumber}`,
                            font: "12px Calibri,sans-serif",
                            fill: new Fill({
                                color: "white",
                            }),
                            backgroundFill: new Fill({
                                color: "black",
                            }),
                            padding: [3, 3, 3, 3],
                            textBaseline: "bottom",
                            offsetY: -10,
                        }),
                        image: new RegularShape({
                            points: 3,
                            radius: 6,
                            angle: Math.PI,
                            fill: new Fill({
                                color: "black",
                            }),
                            displacement: [0, 5],
                        }),
                    })
                );

                // Nastavení vlastností -> uložení původního stylu, vytvoření štítku, typ štítku, přiřazení k ID polylinie
                labelFeature.set("originalStyle", labelFeature.getStyle());
                labelFeature.set("isLabel", true);
                labelFeature.set("type", "info");
                labelFeature.set("polylineId", polylineId);

                //přidání štítků do seznamu s unikátním ID každé individuální linie polylinie
                labelFeatures.push(labelFeature);
                segmentNumber++;
            });

            //vracení pole
            return labelFeatures;
        };

        //událost, která se spustí, když uživatel dokončí kreslení polylinie pomocí výše definované interakce Draw
        drawInteraction.on("drawend", (event) => {
            //proměnná pro polylinii
            const feature = event.feature;
            //geometrie polylinie -> instance LineString
            const geometry = feature.getGeometry();
            //unikátní ID a název polylinií
            const polylineId = `Polylinie-${String(polylineCounter).padStart(
                3,
                "0"
            )}`;
            const polylineName = `Polylinie-${String(polylineCounter).padStart(
                3,
                "0"
            )}`;
            polylineCounter++;

            //kontrola, že prvek je polylinie
            if (geometry instanceof LineString) {
                const coordinates = geometry.getCoordinates();

                //kontrola, že má geometrie 2 a více bodů, jinak ukončí funkci
                if (coordinates.length < 2) {
                    return;
                }

                //přidání liniových štítků pomocí výše definované metody, a přidání do vektorového zdroje pro viditelnost na mapě
                const labelFeatures = createSegmentLabels(
                    geometry,
                    polylineName,
                    polylineId
                );
                vectorSource.addFeatures(labelFeatures);

                //přidání štítků "Start" a "Konec" pomocí výše definované metody
                const startEndLabels = createStartEndLabels(
                    geometry,
                    polylineId
                );

                //iterace přes štítky start a konec, nastavuje styl a přidává je do vektorového zdroje
                startEndLabels.forEach((labelFeature) => {
                    const geometry =
                        labelFeature.getGeometry() as Geometry | null;
                    if (geometry instanceof Geometry) {
                        labelFeature.setStyle(labelFeature.getStyle());
                        vectorSource.addFeature(labelFeature);
                    }
                });

                //přiřazení ID polyliniím a aktualizace dat polylinií
                feature.setId(polylineId);
                updateSegmentData(geometry, polylineId);
            }
        });

        //událost, která se spustí, když uživatel dokončí modifikaci polylinie pomocí výše definované interakce Modify
        //odstraňuje staré štítky, přidává nové a aktualizuje data polylinie
        modifyInteraction.on("modifyend", (event) => {
            //iterace přes všechny modifikované prvky při této události
            event.features.forEach((feature) => {
                //získání ID a geometrie
                const polylineId = feature.getId();
                const geometry = feature.getGeometry();

                //kontrola pro validní ID a geometrii polyčáry
                if (
                    typeof polylineId === "string" &&
                    geometry instanceof LineString
                ) {
                    //odstranění všech štítků souvisejících s polyčárou z vektorového zdroje (liniové + start a konec)
                    const labelsToRemove = vectorSource
                        .getFeatures()
                        .filter((existingFeature) => {
                            return (
                                existingFeature.get("isLabel") &&
                                existingFeature.get("polylineId") === polylineId
                            );
                        });

                    labelsToRemove.forEach((label) =>
                        vectorSource.removeFeature(label)
                    );

                    //vytvoření nových liniových štítků, poté přidání do vektorového zdroje
                    const polylineName = polylineId;
                    const labelFeatures = createSegmentLabels(
                        geometry,
                        polylineName,
                        polylineId
                    );
                    vectorSource.addFeatures(labelFeatures);

                    //vytvoření nových štítků "Start" a "Konec" a přidání do vektorového zdroje
                    const startEndLabels = createStartEndLabels(
                        geometry,
                        polylineId
                    );
                    startEndLabels.forEach((labelFeature) =>
                        vectorSource.addFeature(labelFeature)
                    );

                    //aktualizace dat polylinií v tabulce
                    updateSegmentData(geometry, polylineId);
                }
            });
        });

        //zaregistrování listeneru pro kliknutí na mapu
        map.on("singleclick", (event) => {
            const originalEvent = event.originalEvent;

            //zobrazení popupu pouze při běžném kliknutí (bez Ctrl nebo Alt)
            if (!originalEvent.ctrlKey && !originalEvent.altKey) {
                //schová popup, pokud je kliknuto mimo prvek
                popup.setPosition(undefined);

                //iterace přes prvky v místě kliknutí
                map.forEachFeatureAtPixel(event.pixel, (feature) => {
                    const geometry = feature.getGeometry();

                    //získá ID polyčáry
                    if (geometry instanceof LineString) {
                        const polylineId = feature.getId();

                        //vrátí html element a vloží do něj definovaný obsah
                        if (typeof polylineId === "string") {
                            const popupElement = popup.getElement();
                            if (popupElement) {
                                popupElement.innerHTML = `
                            <div>
                                <p>Opravdu si přejete smazat tento objekt?</p>
                                <button class="btn btn-success" id="deletePolylineBtn">Smazat</button>
                                <button class="btn btn-danger" id="deletePolylineBtn">Zrušit</button>
                            </div>
                        `;

                                //nastavení pozice popupu na souřadnice kliknutí
                                popup.setPosition(event.coordinate);

                                //přidání event listeneru na tlačítko, které zavolá metodu pro mazání, definovanou níže
                                const deleteButton =
                                    document.getElementById(
                                        "deletePolylineBtn"
                                    );
                                if (deleteButton) {
                                    deleteButton.onclick = () =>
                                        deletePolyline(polylineId);
                                }
                            }
                        }
                    }
                });
            }
        });

        //metoda mazání konkrétní polylinie -> získá všechny prvky, získá konkrétní ID polylinie, odstraní ji z vektorového zdroje
        const deletePolyline = (polylineId: string) => {
            const featureToRemove = vectorSource
                .getFeatures()
                .find((feature) => feature.getId() === polylineId);

            if (featureToRemove) {
                vectorSource.removeFeature(featureToRemove);

                //odstranění všech štítků spojených s polylinií (včetně "Start" a "Konec")
                vectorSource.getFeatures().forEach((feature) => {
                    if (
                        feature.get("isLabel") &&
                        feature.get("polylineId") === polylineId
                    ) {
                        vectorSource.removeFeature(feature);
                    }
                });

                //odebrání dat z tabulky
                setSegmentData((prevData) =>
                    prevData.filter((line) => line.id !== polylineId)
                );

                //skrytí popupu po smazání
                popup.setPosition(undefined);
            }
        };

        //metoda pro aktualizaci dat polylinie
        const updateSegmentData = (geometry: LineString, id: string) => {
            //kontrola zda jde o polylinii
            if (geometry instanceof LineString) {
                //získání pole souřadnic
                const rawCoordinates: Coordinate[] = geometry.getCoordinates();

                //transformace na jiný než výchozí souřadnicový systém
                const transformedCoordinates: number[][] =
                    rawCoordinates.map(transformCoordinate);

                //výpočet vlastností individuální linie
                const results: SegmentData[] = calculateAllProperties(
                    transformedCoordinates
                );

                //aktualizace stavu dat
                setSegmentData((prevData) => {
                    //získání existující polylinie
                    const existingLineIndex = prevData.findIndex(
                        (line) => line.id === id
                    );

                    //pokud existuje -> vytvoří kopii aktuálních dat o polylinii a nahradí jimi stará data polylinie
                    if (existingLineIndex !== -1) {
                        //
                        const updatedData = [...prevData];
                        updatedData[existingLineIndex] = {
                            id,
                            segments: results,
                        };
                        return updatedData;
                    } else {
                        //pokud neexistuje, přidá jako novou polylinii
                        return [...prevData, { id, segments: results }];
                    }
                });
            }
        };

        //metoda pro ukončení kreslení pravým klikem a přidání listeneru na pravý klik
        const handleRightClick = (event: MouseEvent) => {
            event.preventDefault();
            drawInteraction.finishDrawing();
        };
        map.getViewport().addEventListener("contextmenu", handleRightClick);

        //cleanup funkce -> odpojení od DOM a zrušení pravokliku, jakožto ukončení kreslení
        return () => {
            map.setTarget(undefined);
            map.getViewport().removeEventListener(
                "contextmenu",
                handleRightClick
            );
        };
    }, [polylineCounter]);

    //-------------------------------------------------------------------------------------------------------------- useEffect()
    //metoda pro zobrazování, či skrývání informačních štítků
    useEffect(() => {
        //kontrola zda existuje vektorový zdroj
        if (vectorSourceRef.current) {
            const vectorSource = vectorSourceRef.current;

            //vybere pouze všechny ty štítky, které byly dříve označeny jako informační - "info"
            const infoLabels = vectorSource.getFeatures().filter((feature) => {
                return (
                    feature.get("isLabel") === true &&
                    feature.get("type") === "info"
                );
            });

            //skrytí nebo zobrazení informačnchí štítků -> když html prvek checked => true, tak zobrazí štítek, a naopak
            infoLabels.forEach((label) => {
                if (showInfoLabels) {
                    const originalStyle = label.get("originalStyle");
                    if (originalStyle) {
                        label.setStyle(originalStyle);
                    }
                } else {
                    label.setStyle(undefined);
                }
            });
        }
    }, [showInfoLabels]);

    return (
        <div className="container-fluid mt-4">
            <div className="row">
                {/* mapa */}
                <div className="col-lg-6 col-md-12 mb-4">
                    <div className="card">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0 tooltip-container">
                                Mapa
                                {/* toggle nápověda */}
                                <i
                                    className="bi bi-question-circle ms-2 tooltip-icon"
                                    onClick={() =>
                                        setShowTooltip((prev) => !prev)
                                    }></i>
                                {showTooltip && (
                                    <div className="tooltip-box">
                                        <button
                                            className="close-tooltip"
                                            onClick={() =>
                                                setShowTooltip(false)
                                            }
                                            aria-label="Close">
                                            &times;
                                        </button>

                                        <h6 className="tooltip-header">
                                            Nápověda k ovládání
                                        </h6>
                                        <ul className="mb-0">
                                            <li>
                                                Držte <strong>Levý Ctrl</strong>{" "}
                                                a klikejte a pohybujte myší pro
                                                kreslení polylinií.
                                            </li>
                                            <li>
                                                Dvojím levoklikem, nebo
                                                jednoduchým pravoklikem myši
                                                ukončíte kreslení.
                                            </li>
                                            <li>
                                                Pro modifikaci polyčar podržte{" "}
                                                <strong>Alt</strong> a táhněte
                                                liniemi, nebo body.
                                            </li>
                                            <li>
                                                Kliknutím na polylinii ji můžete
                                                odstranit.
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </h5>
                        </div>
                        {/* vykreslení mapy a popup okna */}
                        <div className="card-body p-0">
                            <div className="map-style" ref={mapContainerRef}>
                                <div ref={popupRef} className="ol-popup">
                                    {popupContent}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* ovládání a nastavení */}
                <div className="col-lg-6 col-md-12">
                    <div className="card mb-4">
                        <div className="card-header bg-secondary text-white">
                            <h5 className="mb-0">Ovládání a nastavení</h5>
                        </div>
                        <div className="card-body">
                            <form className="row g-3">
                                {/* jednotky vzdálenosti */}
                                <div className="col-md-6">
                                    <label
                                        htmlFor="distanceUnit"
                                        className="form-label">
                                        Jednotka vzdálenosti
                                    </label>
                                    <select
                                        id="distanceUnit"
                                        value={distanceUnit}
                                        onChange={(e) =>
                                            setDistanceUnit(
                                                e.target.value as "km" | "mil"
                                            )
                                        }
                                        className="form-select">
                                        <option value="km">Kilometry</option>
                                        <option value="mil">Míle</option>
                                    </select>
                                </div>
                                {/* jednotky úhlů */}
                                <div className="col-md-6">
                                    <label
                                        htmlFor="angleUnit"
                                        className="form-label">
                                        Jednotka úhlu
                                    </label>
                                    <select
                                        id="angleUnit"
                                        value={angleUnit}
                                        onChange={(e) =>
                                            setAngleUnit(
                                                e.target.value as "°" | "rad"
                                            )
                                        }
                                        className="form-select">
                                        <option value="°">Stupně</option>
                                        <option value="rad">Radiány</option>
                                    </select>
                                </div>
                                {/* checkbox pro zobrazení/skrytí štítků */}
                                <div className="col-md-12">
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            id="showInfoLabels"
                                            checked={showInfoLabels}
                                            onChange={(e) =>
                                                setShowInfoLabels(
                                                    e.target.checked
                                                )
                                            }
                                            className="form-check-input"
                                        />
                                        <label
                                            htmlFor="showInfoLabels"
                                            className="form-check-label">
                                            Zobrazit informační prvky
                                        </label>
                                    </div>
                                </div>
                                {/* tlačítko pro smazání všech vytvořených objektů */}
                                <div className="col-md-12 text-center">
                                    <button
                                        type="button"
                                        className="btn btn-danger w-100"
                                        onClick={clearAllFeatures}>
                                        Smazat vše
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* tabulka s daty */}
                    <div className="card">
                        <div className="card-header bg-success text-white">
                            <h5>Data všech polylinií</h5>
                        </div>
                        <div className="card-body p-0 scrollable-table">
                            <table className="table table-striped table-hover m-0">
                                <thead className="sticky-top">
                                    <tr className="bg-light">
                                        <th>Linie</th>
                                        <th>
                                            Délka (
                                            {distanceUnit === "km"
                                                ? "km"
                                                : "mil"}
                                            )
                                        </th>
                                        <th>
                                            Azimut (
                                            {angleUnit === "°" ? "°" : "rad"})
                                        </th>
                                        <th>
                                            Úhel (
                                            {angleUnit === "°" ? "°" : "rad"})
                                        </th>
                                        <th>Počáteční souřadnice (lat, lon)</th>
                                        <th>Koncové souřadnice (lat, lon)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {segmentData.map((line) => (
                                        <React.Fragment key={line.id}>
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="sticky-polyline text-primary text-center fw-bold">
                                                    {line.id}
                                                </td>
                                            </tr>
                                            {line.segments.map(
                                                (data, index) => (
                                                    <tr key={index}>
                                                        <td>{data.segment}</td>
                                                        <td>
                                                            {convertDistance(
                                                                data.length,
                                                                distanceUnit
                                                            )}
                                                        </td>
                                                        <td>
                                                            {convertAngle(
                                                                data.azimuth,
                                                                angleUnit
                                                            )}
                                                        </td>
                                                        <td>
                                                            {data.angleToNext !==
                                                            undefined
                                                                ? convertAngle(
                                                                      data.angleToNext,
                                                                      angleUnit
                                                                  )
                                                                : "-"}
                                                        </td>
                                                        <td>
                                                            {`${data.startLatLon[0].toFixed(
                                                                6
                                                            )}, ${data.startLatLon[1].toFixed(
                                                                6
                                                            )}`}
                                                        </td>
                                                        <td>
                                                            {`${data.endLatLon[0].toFixed(
                                                                6
                                                            )}, ${data.endLatLon[1].toFixed(
                                                                6
                                                            )}`}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                            {/*zobrazení celkové délky pro aktuální polylinii*/}
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="text-end fw-bold">
                                                    Celková délka:{" "}
                                                    {convertDistance(
                                                        calculateTotalLength(
                                                            line.segments
                                                        ),
                                                        distanceUnit
                                                    )}{" "}
                                                    {distanceUnit === "km"
                                                        ? "km"
                                                        : "mil"}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportMapComponent;
