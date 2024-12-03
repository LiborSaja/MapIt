import ImportMapComponent from "./import/ImportMapComponent";
import InfoComponent from "./info/InfoComponent";

const MapComponent: React.FC = () => {
    return (
        <div className="container-fluid">
            {/* Tlačítka a Mapa ve sloupci */}
            <div className="row mb-3">
                <div className="col-12 col-lg-9">
                    {/* Tlačítka */}
                    <div className="row mb-3">
                        <div className="col-12 col-sm-6 col-lg-3 mb-2">
                            <button className="btn btn-success w-100">
                                Přidat linii
                            </button>
                        </div>
                        <div className="col-12 col-sm-6 col-lg-3 mb-2">
                            <button className="btn btn-primary w-100">
                                Přemístit bod
                            </button>
                        </div>
                        <div className="col-12 col-sm-6 col-lg-3 mb-2">
                            <button className="btn btn-warning w-100">
                                Smazat linii
                            </button>
                        </div>
                        <div className="col-12 col-sm-6 col-lg-3 mb-2">
                            <button className="btn btn-danger w-100">
                                Smazat vše
                            </button>
                        </div>
                    </div>

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
