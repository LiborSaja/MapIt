import "./GuideComponent.css";

const GuideComponent: React.FC = () => {
    return (
        <div className="container mybg">
            <div id="carouselExampleCaptions" className="carousel slide">
                <div className="carousel-indicators">
                    <button
                        type="button"
                        data-bs-target="#carouselExampleCaptions"
                        data-bs-slide-to="0"
                        className="active"
                        aria-current="true"
                        aria-label="Slide 1"></button>
                    <button
                        type="button"
                        data-bs-target="#carouselExampleCaptions"
                        data-bs-slide-to="1"
                        aria-label="Slide 2"></button>
                    <button
                        type="button"
                        data-bs-target="#carouselExampleCaptions"
                        data-bs-slide-to="2"
                        aria-label="Slide 3"></button>
                    <button
                        type="button"
                        data-bs-target="#carouselExampleCaptions"
                        data-bs-slide-to="3"
                        aria-label="Slide 4"></button>
                    <button
                        type="button"
                        data-bs-target="#carouselExampleCaptions"
                        data-bs-slide-to="4"
                        aria-label="Slide 5"></button>
                </div>
                <div className="carousel-inner">
                    <div className="carousel-item active">
                        <img src="mapahl.png" alt="" />
                        <div className="carousel-caption-below">
                            <h5 className="p-5 text-center">
                                Vítejte v obrázkovém průvodci aplikací. Na
                                několika slidech zjistíte základní používání
                                této aplikace.
                            </h5>
                        </div>
                    </div>
                    <div className="carousel-item">
                        <img
                            src="rozhrani.png"
                            className="d-block w-100"
                            alt="..."
                        />
                        <div className="carousel-caption-below">
                            <h6 className="p-5">
                                <strong className="text-primary">
                                    KRESLENÍ:{" "}
                                </strong>
                                polylinie je možné kreslit pouze při kombinaci
                                stisknuté klávesy levého CTRL a levého tlačítka
                                myši. Každý jeden klik vytvoří zlomový bod
                                polylinie. <br />
                                <strong className="text-primary">
                                    PŘERUŠENÍ KRESLENÍ:{" "}
                                </strong>
                                je možné pomocí dvojitého kliknutí na levé
                                tlačítko myši, nebo jednoduchého kliknutí na
                                pravé tlačítko myši.
                            </h6>
                        </div>
                    </div>
                    <div className="carousel-item">
                        <img
                            src="modifikace.png"
                            className="d-block w-100"
                            alt="..."
                        />
                        <div className="carousel-caption-below">
                            <h5 className="p-5">
                                <strong className="text-primary">
                                    MODIFIKACE:{" "}
                                </strong>
                                modifikovat nakreslenou polylini je možné za
                                pomoci stisknuté levé klávesy ALT a následného
                                chycení jakékoliv části polylinie pomocí levého
                                tlačítka myši. Tím bude docházet k vytvoření
                                nového bodu zlomu na polylinii, nebo k přesunutí
                                stávajícího.
                            </h5>
                        </div>
                    </div>
                    <div className="carousel-item">
                        <img
                            src="mazani.png"
                            className="d-block w-100"
                            alt="..."
                        />
                        <div className="carousel-caption-below">
                            <h5 className="p-5">
                                <strong className="text-primary">
                                    SMAZÁNÍ:{" "}
                                </strong>
                                je možné při prostém klinutí levým tlačítkem
                                myši na danou polylinii, čímž dojde k vyvolání
                                menu pro smazání.
                            </h5>
                        </div>
                    </div>
                    <div className="carousel-item">
                        <img
                            src="panely.png"
                            className="d-block w-100"
                            alt="..."
                        />
                        <div className="carousel-caption-below">
                            <h5 className="p-2">
                                <strong className="text-primary">
                                    OVLÁDACÍ A INFORMAČNÍ PANELY:{" "}
                                </strong>{" "}
                                zde lze nastavovat jednotky úhlů a vzdálenosti.
                                Dále zobrazit/skrýt popisky linií na mapě. Také
                                lze celou mapu vyčistit pomocí tlačítka{" "}
                                <span className="text-danger">Smazat vše</span>.
                                V sekci informací lze vidět data každé části
                                polylinie - délku, azimut, úhel svíraný mezi
                                bodem a dvěma přilehlými liniemi (pokud
                                existují), zeměpisnou délku a šířku počátečního
                                a koncového bodu polylinie. Na konci dat se pak
                                nachází celková délka polylinie.
                            </h5>
                        </div>
                    </div>
                </div>
                <button
                    className="carousel-control-prev"
                    type="button"
                    data-bs-target="#carouselExampleCaptions"
                    data-bs-slide="prev">
                    <span
                        className="carousel-control-prev-icon"
                        aria-hidden="true"></span>
                    <span className="visually-hidden">Previous</span>
                </button>
                <button
                    className="carousel-control-next"
                    type="button"
                    data-bs-target="#carouselExampleCaptions"
                    data-bs-slide="next">
                    <span
                        className="carousel-control-next-icon"
                        aria-hidden="true"></span>
                    <span className="visually-hidden">Next</span>
                </button>
            </div>
        </div>
    );
};
export default GuideComponent;
