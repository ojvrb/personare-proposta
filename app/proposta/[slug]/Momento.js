import Reveal from "@/app/components/Reveal";

// Momento cinematografico -- foto full-bleed sem card, opcional uma frase
// grande sobreposta em serifa italica. E' o que separa capitulos com peso
// visual (tipo o hero cheio da Apple entre secoes).
export default function Momento({ momento }) {
  return (
    <Reveal>
      <section className="momento">
        <img src={momento.foto_url} alt="" className="momento-foto" />
        <div className="momento-overlay" />
        {momento.frase && (
          <div className="momento-frase-wrap">
            <p className="momento-frase">{momento.frase}</p>
          </div>
        )}
      </section>
    </Reveal>
  );
}
