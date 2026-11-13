import { ArtLabel } from '@/components/Art/ArtArticleParts';
import { SITE } from '@/lib/seo';
import './about.css';

export const RESUME_URL = 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/resume.pdf';

const HISTORY: [year: string, place: string, role: string][] = [
  ['2025', 'CAMBER', 'Analytics lead, then AI product engineer.'],
  ['2023', 'ANOMALY SIX', 'Data scientist, then lead data scientist.'],
  ['2022', 'DAOHQ', 'Data scientist on real-time market data.'],
  ['2021', 'BABSON', 'BS in quantitative methods, summa cum laude.'],
  ['2020', 'MUSICPLACE', "Co-founder. Fans could buy a share of an album's streams."],
];

function hostLabel(url: string): string {
  return new URL(url).hostname.replace('www.', '').replace('open.', '').split('.')[0].toUpperCase();
}

export function AboutArticle() {
  return (
    <article className="art-article" aria-label="About Worthy Rae">
      <p className="art-intro">
        I'm an AI product engineer in New York. I look for the problem that matters most and build the whole answer
        myself, from the data pipeline to the screen someone uses.
      </p>

      <ArtLabel>NOW</ArtLabel>
      <p>
        I work at Camber, a healthcare technology company. I built its AI fraud detection pipeline, which reviews more
        than $2B in insurance claims a year, and an internal AI assistant that 108 people use about 6,000 times a day.
      </p>

      <ArtLabel>BEFORE</ArtLabel>
      <ol className="art-steps about-history">
        {HISTORY.map(([year, place, role]) => (
          <li key={place}>
            <span>{year}</span>
            <span>{place}</span>
            <span>{role}</span>
          </li>
        ))}
      </ol>

      <ArtLabel>ON THE SIDE</ArtLabel>
      <p>
        I run StreamClout, which tracks daily Spotify plays for 81 million songs. I make generative art with StyleGAN
        and computer vision, and I write and record music.
      </p>

      <ArtLabel>ELSEWHERE</ArtLabel>
      <div className="about-links">
        {SITE.sameAs.map((url) => (
          <a key={url} href={url} target="_blank" rel="me noopener noreferrer">{hostLabel(url)}</a>
        ))}
      </div>
    </article>
  );
}
