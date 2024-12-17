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
import Extent from "ol/interaction/Extent";
import { platformModifierKeyOnly } from "ol/events/condition";
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
    //pro zobrazení/skrytí pop-up tooltipu po kliknutí na polylinii
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
            controls: defaultControls().extend([]),
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

        //vytvoření nterakce pro modifikaci
        const modifyInteraction = new Modify({
            source: vectorSource,
            condition: altKeyOnly,
        });

        //
        const extentInteraction = new Extent({
            condition: platformModifierKeyOnly, 
            pointerStyle: [], 
        });
        extentInteraction.setActive(false);
        map.addInteraction(extentInteraction);

        // Povolení a zakázání interakce
        document.addEventListener("keydown", (event) => {
            if (event.key === "ctrl") {
                extentInteraction.setActive(true); // Aktivuje interakci při stisku Shift
            }
        });

        document.addEventListener("keyup", (event) => {
            if (event.key === "ctrl") {
                extentInteraction.setActive(false); // Deaktivuje interakci při uvolnění Shift
            }
        });

        const createStartEndLabels = (
            lineString: LineString,
            polylineId: string
        ) => {
            const features: Feature<Point>[] = [];

            // Zkontroluj, zda má polyčára alespoň dva body
            const coordinates = lineString.getCoordinates();
            if (coordinates.length < 2) {
                return features; // Nepřidávej žádné štítky
            }

            // Začátek polylinie
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
                startFeature.set("isLabel", true); // Označení jako štítek
                startFeature.set("polylineId", polylineId); // Přidání ID polyčáry
                features.push(startFeature);
            }

            // Konec polylinie
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
                endFeature.set("isLabel", true); // Označení jako štítek
                endFeature.set("polylineId", polylineId); // Přidání ID polyčáry
                features.push(endFeature);
            }

            return features;
        };

        // Funkce pro vytvoření štítků
        const createSegmentLabels = (
            lineString: LineString,
            polylineName: string,
            polylineId: string
        ) => {
            const labelFeatures: Feature<Point>[] = [];
            let segmentNumber = 1;

            lineString.forEachSegment((start, end) => {
                const segment = new LineString([start, end]);
                const midPoint = segment.getCoordinateAt(0.5);

                const labelFeature = new Feature({
                    geometry: new Point(midPoint),
                });

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
                            points: 3, // Špička jako trojúhelník
                            radius: 6,
                            angle: Math.PI, // Otočení trojúhelníku dolů
                            fill: new Fill({
                                color: "black",
                            }),
                            displacement: [0, 5], // Posun špičky směrem dolů
                        }),
                    })
                );

                // Uložení původního stylu
                labelFeature.set("originalStyle", labelFeature.getStyle());

                // Nastavení vlastností pro identifikaci štítku
                labelFeature.set("isLabel", true); // Obecný štítek
                labelFeature.set("type", "info"); // Typ štítku: informační
                labelFeature.set("polylineId", polylineId); // ID polyčáry

                labelFeatures.push(labelFeature);
                segmentNumber++;
            });

            return labelFeatures;
        };

        drawInteraction.on("drawend", (event) => {
            const feature = event.feature;
            const geometry = feature.getGeometry();
            const polylineId = `Polylinie-${String(polylineCounter).padStart(
                3,
                "0"
            )}`;
            const polylineName = `Polylinie-${String(polylineCounter).padStart(
                3,
                "0"
            )}`;
            polylineCounter++;

            if (geometry instanceof LineString) {
                const coordinates = geometry.getCoordinates();

                // Kontrola: pokud má geometrie méně než 2 body, ukonči funkci
                if (coordinates.length < 2) {
                    console.warn(
                        "Geometrie má méně než dva body, nebude zpracována."
                    );
                    return;
                }

                // Přidání segmentových štítků
                const labelFeatures = createSegmentLabels(
                    geometry,
                    polylineName,
                    polylineId
                );
                vectorSource.addFeatures(labelFeatures);

                // Přidání štítků "Start" a "Konec"
                const startEndLabels = createStartEndLabels(
                    geometry,
                    polylineId
                );
                startEndLabels.forEach((labelFeature) => {
                    const geometry =
                        labelFeature.getGeometry() as Geometry | null; // Explicitní určení typu
                    if (geometry instanceof Geometry) {
                        labelFeature.setStyle(labelFeature.getStyle()); // Nastavení stylu
                        vectorSource.addFeature(labelFeature); // Přidání do vektorového zdroje
                    } else {
                        console.error(
                            "Geometrie pro štítek není platná nebo není podporována."
                        );
                    }
                });

                // Nastavení ID a aktualizace dat
                feature.setId(polylineId);
                updateSegmentData(geometry, polylineId);
            }
        });

        modifyInteraction.on("modifyend", (event) => {
            event.features.forEach((feature) => {
                const polylineId = feature.getId();
                const geometry = feature.getGeometry();

                if (
                    typeof polylineId === "string" &&
                    geometry instanceof LineString
                ) {
                    // Mazání existujících segmentových štítků (bez "Start" a "Konec")
                    const labelsToRemove = vectorSource
                        .getFeatures()
                        .filter((existingFeature) => {
                            const style = existingFeature.getStyle();
                            if (style instanceof Style) {
                                const text = style.getText()?.getText();
                                return (
                                    existingFeature.get("isLabel") &&
                                    existingFeature.get("polylineId") ===
                                        polylineId &&
                                    text !== "Start" &&
                                    text !== "Konec"
                                );
                            }
                            return false;
                        });

                    labelsToRemove.forEach((label) =>
                        vectorSource.removeFeature(label)
                    );

                    // Vytvoření nových segmentových štítků
                    const polylineName = `Polylinie ${
                        polylineId.split("-")[1]
                    }`;
                    const labelFeatures = createSegmentLabels(
                        geometry,
                        polylineName,
                        polylineId
                    );

                    // Přidání nových štítků a aktualizace jejich vlastností
                    labelFeatures.forEach((labelFeature) => {
                        vectorSource.addFeature(labelFeature);

                        // Uložení původního stylu
                        labelFeature.set(
                            "originalStyle",
                            labelFeature.getStyle()
                        );
                    });

                    // Aktualizace dat (pokud je potřeba)
                    updateSegmentData(geometry, polylineId);
                }
            });
        });

        map.addInteraction(drawInteraction);
        map.addInteraction(modifyInteraction);

        // Kliknutí pro zobrazení popupu
        map.on("singleclick", (event) => {
            const originalEvent = event.originalEvent;

            // Zobrazení popupu pouze při běžném kliknutí (bez Ctrl nebo Alt)
            if (!originalEvent.ctrlKey && !originalEvent.altKey) {
                popup.setPosition(undefined); // Skryje popup, pokud není prvek
                map.forEachFeatureAtPixel(event.pixel, (feature) => {
                    const geometry = feature.getGeometry();

                    if (geometry instanceof LineString) {
                        const polylineId = feature.getId(); // Získání ID polyčáry

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

                                // Nastavení pozice popupu na souřadnice kliknutí
                                popup.setPosition(event.coordinate);

                                // Přidání event listeneru na tlačítko
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

        // Metoda pro mazání konkrétní polyčáry
        const deletePolyline = (polylineId: string) => {
            // Najít a odstranit feature s daným ID
            const featureToRemove = vectorSource
                .getFeatures()
                .find((feature) => feature.getId() === polylineId);

            if (featureToRemove) {
                vectorSource.removeFeature(featureToRemove);

                // Odstranění všech štítků spojených s polyčárou (včetně "Start" a "Konec")
                vectorSource.getFeatures().forEach((feature) => {
                    if (
                        feature.get("isLabel") &&
                        feature.get("polylineId") === polylineId
                    ) {
                        vectorSource.removeFeature(feature);
                    }
                });

                // Odebrání dat z tabulky
                setSegmentData((prevData) =>
                    prevData.filter((line) => line.id !== polylineId)
                );

                // Skrytí popupu po smazání
                popup.setPosition(undefined);

                console.log(
                    `Polyčára s ID ${polylineId} byla úspěšně smazána.`
                );
            } else {
                console.warn(`Polyčára s ID ${polylineId} nebyla nalezena.`);
            }
        };

        const updateSegmentData = (geometry: LineString, id: string) => {
            if (geometry instanceof LineString) {
                const rawCoordinates: Coordinate[] = geometry.getCoordinates(); // EPSG:3857
                const transformedCoordinates: number[][] =
                    rawCoordinates.map(transformCoordinate);

                const results: SegmentData[] = calculateAllProperties(
                    transformedCoordinates
                );

                setSegmentData((prevData) => {
                    const existingLineIndex = prevData.findIndex(
                        (line) => line.id === id
                    );

                    if (existingLineIndex !== -1) {
                        // Aktualizujeme existující polyčáru
                        const updatedData = [...prevData];
                        updatedData[existingLineIndex] = {
                            id,
                            segments: results,
                        };
                        return updatedData;
                    } else {
                        // Přidáme novou polyčáru
                        return [...prevData, { id, segments: results }];
                    }
                });
            }
        };

        // Funkce pro ukončení kreslení pravým klikem
        const handleRightClick = (event: MouseEvent) => {
            event.preventDefault(); // Zabrání zobrazení kontextového menu
            drawInteraction.finishDrawing(); // Ukončení aktuálního kreslení
        };

        // Přidání listeneru na pravý klik
        map.getViewport().addEventListener("contextmenu", handleRightClick);

        return () => {
            map.setTarget(undefined);
            map.getViewport().removeEventListener(
                "contextmenu",
                handleRightClick
            );
        };
    }, [polylineCounter]);

    useEffect(() => {
        if (vectorSourceRef.current) {
            const vectorSource = vectorSourceRef.current;

            // Získej všechny informační štítky
            const infoLabels = vectorSource.getFeatures().filter((feature) => {
                return (
                    feature.get("isLabel") === true &&
                    feature.get("type") === "info" // Identifikátor informačních štítků
                );
            });

            // Skrýt nebo zobrazit informační štítky
            infoLabels.forEach((label) => {
                if (showInfoLabels) {
                    // Obnovit původní styl
                    const originalStyle = label.get("originalStyle");
                    if (originalStyle) {
                        label.setStyle(originalStyle);
                    }
                } else {
                    // Skrýt štítek
                    label.setStyle(undefined);
                }
            });
        }
    }, [showInfoLabels]);

    return (
        <div className="container-fluid mt-4">
            <div className="row">
                {/* Mapa */}
                <div className="col-lg-6 col-md-12 mb-4">
                    <div className="card">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0 tooltip-container">
                                Mapa
                                {/* Otazník s toggle funkcí */}
                                <i
                                    className="bi bi-question-circle ms-2 tooltip-icon"
                                    onClick={() =>
                                        setShowTooltip((prev) => !prev)
                                    }></i>
                                {/* Tooltip s obsahem */}
                                {showTooltip && (
                                    <div className="tooltip-box">
                                        {/* Zavírací tlačítko */}
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
                        <div className="card-body p-0">
                            <div className="map-style" ref={mapContainerRef}>
                                <div ref={popupRef} className="ol-popup">
                                    {popupContent}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Ovládání a nastavení */}
                <div className="col-lg-6 col-md-12">
                    <div className="card mb-4">
                        <div className="card-header bg-secondary text-white">
                            <h5 className="mb-0">Ovládání a nastavení</h5>
                        </div>
                        <div className="card-body">
                            <form className="row g-3">
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

                    {/* Tabulka dat */}
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
                                            {/* Zobrazení celkové délky pro aktuální polylinii */}
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
