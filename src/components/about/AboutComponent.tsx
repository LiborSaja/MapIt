import { Link } from "react-router";

// komponenta o aplikaci
const AboutComponent: React.FC = () => {
    return (
        <div className="container-fluid mt-4">
            <div className="row">
                <div className="col-12">
                    <p>
                        <strong>
                            Vítejte v aplikaci pro správu a vizualizaci
                            geografických dat!
                        </strong>
                    </p>
                    <p>
                        Tato aplikace je navržena pro uživatele, kteří potřebují
                        interaktivní nástroje pro práci s polyliniemi
                        (geografickými trasami), včetně jejich kreslení,
                        modifikace, analýzy a správy. Nabízí širokou škálu
                        funkcí, které vám umožní snadno pracovat s daty na mapě
                        a analyzovat vlastnosti tras, jako je délka, azimut,
                        úhly mezi segmenty a další.
                    </p>
                    <p>
                        Pro seznámení s kompletní funkčností aplikace lze využít{" "}
                        <Link to="/guide">průvodce</Link>.
                    </p>
                    <hr />

                    <h2 className="text-success mt-3">Hlavní Funkce</h2>
                    <ul>
                        <li>
                            <strong>Interaktivní kreslení tras:</strong>{" "}
                            Uživatelé mohou pomocí jednoduchého ovládání kreslit
                            polylinie přímo na mapě. Každá polylinie je
                            rozdělena na segmenty, které mohou být samostatně
                            analyzovány.
                        </li>
                        <li>
                            <strong>Úpravy tras v reálném čase:</strong>{" "}
                            Vytvořené trasy lze snadno modifikovat. Můžete měnit
                            jejich tvar přímo na mapě a aplikace okamžitě
                            aktualizuje všechny vlastnosti tras.
                        </li>
                        <li>
                            <strong>Automatická analýza segmentů:</strong> Každý
                            segment polylinie je automaticky analyzován, včetně
                            délky, azimutu a úhlů mezi segmenty.
                        </li>
                        <li>
                            <strong>Tabulkové zobrazení dat:</strong> Veškerá
                            data o trasách a jejich segmentech jsou přehledně
                            zobrazena v tabulce, která se aktualizuje při každé
                            změně. Na konci dat každé polylinie je uvedena její
                            celková délka, což umožňuje rychlou analýzu.
                        </li>
                        <li>
                            <strong>Export a správa tras:</strong> Aplikace
                            umožňuje snadno spravovat vytvořené polylinie. Trasy
                            je možné mazat nebo obnovovat podle potřeby.
                        </li>
                    </ul>

                    <hr />

                    <h2 className="text-success mt-3">Technologie</h2>
                    <p>
                        Aplikace je postavena na moderních technologiích, které
                        zajišťují její výkon, spolehlivost a snadnou
                        ovladatelnost:
                    </p>
                    <ul>
                        <li>
                            <strong>Frontend:</strong> React a TypeScript – pro
                            interaktivní a dynamické uživatelské rozhraní
                        </li>
                        <li>
                            <strong>Knihovny pro mapy:</strong> OpenLayers – pro
                            přesnou vizualizaci a interakci s geografickými daty
                        </li>
                        <li>
                            <strong>Stylování:</strong> Bootstrap – pro moderní
                            a responzivní design
                        </li>
                        <li>
                            <strong>Výpočtové služby:</strong> Vlastní
                            implementace geometrických výpočtů pro analýzu tras
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
export default AboutComponent;
