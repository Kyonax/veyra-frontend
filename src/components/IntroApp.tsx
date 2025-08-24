import Image from "next/image";
import myImage from '@/assets/Blue Modern Pitch Deck Presentation .png';

interface IntroAppProps {
  onStart: () => void;
}

export default function IntroApp({ onStart }: IntroAppProps) {
  return (
    <div className="w-full grid justify-items-center intro-app-main-container">
      <Image
        className="image-logo"
        src={myImage}
        alt="Description of image"
        width={250}
        height={100}
        priority
      />

      <main className="intro-app-main">
        <h1>TU PYME POTENCIADA AL INSTANTE</h1>
        <p>
          La primera agencia de marketing impulsada por IA que ayuda a las pymes a crecer directamente desde WhatsApp.
        </p>
        <button
          className="mt-9 btn-primary place-self-center"
          onClick={onStart} // <-- trigger parent state
        >
          ¡Hazlo posible!
        </button>
      </main>

      <div className="mt-3 w-[67%] max-w-[890px] grid text-right">
        <span>{`>`} build_by :: <strong>veyra corp</strong></span>
      </div>

      <div className="w-full footer-intro-app">
        <div className="footer-column">
          <p>
            Democratizamos el <strong>marketing de clase mundial</strong> para las
            <strong> pymes latinoamericanas.</strong>
          </p>
        </div>
        <div className="footer-column">
          <p>
            Redefinimos el marketing para las <strong>PYMES</strong> en
            <strong> LATAM.</strong>
          </p>
        </div>
        <div className="footer-column">
          <p>
            Tu equipo de <strong>Marketing</strong> disponible <strong>24/7.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
