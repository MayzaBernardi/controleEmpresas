// Aproximação em CSS da marca real do Pollen (ver pollenparque.com.br): "pollen" em
// minúsculas com o primeiro "o" substituído por um círculo em gradiente verde. Se algum dia
// tivermos o arquivo oficial (SVG/PNG) em front/public/, vale trocar isso por um <Image>.
export function PollenLogo({
  textClassName = "text-foreground",
  circleClassName = "",
}: {
  textClassName?: string;
  circleClassName?: string;
}) {
  return (
    <span className={`inline-flex items-baseline font-display font-extrabold ${textClassName}`}>
      <span>P</span>
      <span
        className={`inline-block rounded-full ${circleClassName}`}
        style={{
          width: "0.6em",
          height: "0.6em",
          background: "linear-gradient(135deg, #e2f77e 0%, #2f9e4f 100%)",
        }}
      />
      <span>llen</span>
    </span>
  );
}
