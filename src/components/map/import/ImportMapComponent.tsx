import React, { useEffect } from "react";
import "ol/ol.css"; // Styl OpenLayers
import { Map, View } from "ol"; // Základní třídy OpenLayers
import { Tile as TileLayer } from "ol/layer"; // Vrstva dlaždic
import { OSM } from "ol/source"; // Zdroj mapových dat (OpenStreetMap)
import { fromLonLat } from "ol/proj";

const ImportMapComponent: React.FC = () => {
    useEffect(() => {
        // Inicializace mapy
        const map = new Map({
            target: "map", // ID elementu, kam se mapa vykreslí
            layers: [
                new TileLayer({
                    source: new OSM(), // Zdroj: OpenStreetMap
                }),
            ],
            view: new View({
                center: fromLonLat([16.626263448084117, 49.19754791432539]),
                zoom: 13, // Výchozí úroveň přiblížení
            }),
        });

        // Vyčištění mapy při odpojení komponenty
        return () => map.setTarget(undefined);
    }, []);

    return (
        <div
            id="map" // ID, na které se OpenLayers mapuje
            style={{
                width: "100%",
                height: "37vw",
            }}></div>
    );
};

export default ImportMapComponent;
