import Image from "next/image";

export default function HomePage() {
  return (
    <main className="site-shell">
      <section className="hero" aria-labelledby="hero-title">
        <Image
          className="brand-logo"
          src="/brand/umoja-logo.svg"
          alt="Umoja"
          width={640}
          height={180}
          priority
        />
        <div className="hero-copy">
          <p className="eyebrow">Umoja Platform</p>
          <h1 id="hero-title">African expertise. One trusted force.</h1>
          <p className="introduction">
            A bilingual delivery collective is taking shape—built for trusted teams,
            meaningful work, and lasting capability.
          </p>
          <p className="status" role="status">
            <span aria-hidden="true" /> Platform foundation in progress
          </p>
        </div>
        <Image
          className="brand-mark"
          src="/brand/umoja-mark.svg"
          alt=""
          width={256}
          height={256}
        />
      </section>
    </main>
  );
}
