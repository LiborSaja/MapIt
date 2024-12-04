import ImportMapComponent from "./import/ImportMapComponent";

const MapComponent: React.FC = () => {
    return (
        <div className="container-fluid">
            {/* Tlačítka a Mapa ve sloupci */}
            <div className="row mb-3">
                <div className="col-12">
                    <ImportMapComponent />
                </div>
            </div>
        </div>
    );
};

export default MapComponent;
