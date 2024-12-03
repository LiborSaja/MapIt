import ImportMapComponent from "./import/ImportMapComponent";
import InfoComponent from "./info/InfoComponent";

const MapComponent: React.FC = () => {
    return (
        <div className="container-fluid">
            {/* Tlačítka a Mapa ve sloupci */}
            <div className="row mb-3">
                <div className="col-12 col-lg-9">
                    {/* Mapa */}
                    <div className="row">
                        <div className="col-12">
                            <ImportMapComponent />
                        </div>
                    </div>
                </div>

                {/* InfoComponent */}
                <div className="col-12 col-lg-3">
                    <InfoComponent />
                </div>
            </div>
        </div>
    );
};

export default MapComponent;
