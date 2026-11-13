import { ArtLabel, ArtTags, InViewClip } from './ArtArticleParts';

const MEDIA = '/media/livestream/';

const STEPS: [string, string][] = [
  ['RECEIVE', "Fetch the next six-second piece of the camera's stream."],
  ['DECODE', 'Unpack it into 1920 × 1080 frames with FFmpeg.'],
  ['PAINT', 'Move, retire and lay strokes, then add the slow wave.'],
  ['ENCODE', 'Pack the painted frames back into H.264 video.'],
  ['PLAY', 'Publish it to the stream while the next piece is painted.'],
];

export function LivestreamArticle({ summary, tech }: { summary: string; tech: string[] }) {
  return (
    <article className="art-article" aria-label="About the live painting">
      <p className="art-intro">{summary}</p>

      <ArtLabel>FROM CAMERA TO CANVAS</ArtLabel>
      <p>
        The camera sees the street. The painter never copies a frame: it keeps a canvas of individual brushstrokes
        and decides, about a dozen times a second, which ones to move, which to retire and where to lay new paint.
      </p>
      <div className="art-grid art-grid-2">
        <InViewClip wide src={`${MEDIA}camera.mp4`} poster={`${MEDIA}camera.jpg`} caption="THE CAMERA" />
        <InViewClip wide src={`${MEDIA}painting.mp4`} poster={`${MEDIA}painting.jpg`} caption="THE PAINTING" />
      </div>

      <ArtLabel>STROKES THAT REMEMBER</ArtLabel>
      <div className="art-aside">
        <InViewClip src={`${MEDIA}detail.mp4`} poster={`${MEDIA}detail.jpg`} caption="DETAIL" />
        <p>
          Every stroke keeps its own position, direction, length, width and pigment. When a car moves, the strokes
          describing it travel with it instead of being repainted. Broad marks lay the ground in three coats, and
          finer marks gather where the scene has detail. Each one is a filbert brush with dry tips and bristle
          texture.
        </p>
      </div>

      <ArtLabel>ONE SEGMENT AT A TIME</ArtLabel>
      <ol className="art-steps">
        {STEPS.map(([name, text], i) => (
          <li key={name}>
            <span>{i + 1}</span>
            <span>{name}</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>

      <ArtLabel>TOOLS</ArtLabel>
      <ArtTags tags={tech} />
    </article>
  );
}
