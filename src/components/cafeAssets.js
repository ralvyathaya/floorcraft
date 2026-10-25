import { useEffect, useState } from 'react';
import atlas from '../assets/furniture-atlas.json';
import customersUrl from '../assets/cafe-customers.png';
import actorsUrl from '../assets/cafe-actors.png';
import actorAtlas from '../assets/actor-atlas.json';
import oakFloor from '../assets/oak-floor.png';
import industrialFloor from '../assets/industrial-floor.png';
import terracottaFloor from '../assets/terracotta-floor.png';
import oakSeating from '../assets/oak-seating.png';
import oakService from '../assets/oak-service.png';
import oakProps from '../assets/oak-props.png';
import industrialSeating from '../assets/industrial-seating.png';
import industrialService from '../assets/industrial-service.png';
import industrialProps from '../assets/industrial-props.png';
import terracottaSeating from '../assets/terracotta-seating.png';
import terracottaService from '../assets/terracotta-service.png';
import terracottaProps from '../assets/terracotta-props.png';

const themeAssets = {
  oak: { floor: oakFloor, seating: oakSeating, service: oakService, props: oakProps },
  industrial: { floor: industrialFloor, seating: industrialSeating, service: industrialService, props: industrialProps },
  terracotta: { floor: terracottaFloor, seating: terracottaSeating, service: terracottaService, props: terracottaProps },
};
const crop = ([x, y, width, height]) => ({ x, y, width, height });
export const actorFrames = actorAtlas.rows.map(row => row.map(crop));
export const actorAnchors = actorAtlas.anchor;
export function artForFurniture(themeId, object) {
  return atlas[themeId][object.type === 'counter' ? object.id : object.type][(object.rotation ?? 0) / 90];
}

export const customerFrames = [
  [[156,31,97,270], [443,33,96,269], [711,35,103,262], [988,32,104,265]],
  [[153,338,117,264], [415,337,125,267], [701,342,123,260], [971,338,137,265]],
  [[154,647,99,271], [439,647,102,271], [710,652,105,262], [991,648,105,266]],
  [[156,947,121,272], [414,946,126,275], [702,955,124,265], [969,954,147,268]],
].map((row) => row.map(crop));

export function useCafeAssets(themeId) {
  const [assets, setAssets] = useState({ status: 'loading' });
  useEffect(() => {
    let active = true;
    const images = [];
    const load = (url) => new Promise((resolve, reject) => {
      const image = new window.Image(); images.push(image);
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Café artwork could not load. Reload to try again; layout editing and simulation still work.'));
      image.src = url;
    });
    const urls = themeAssets[themeId];
    Promise.all([load(urls.seating), load(urls.service), load(urls.props), load(customersUrl), load(urls.floor), load(actorsUrl)]).then(([seating, service, props, customers, floor, actors]) => {
      if (active) setAssets({ themeId, status: 'ready', furniture: { seating, service, props }, customers, floor, actors });
    }).catch((error) => { if (active) setAssets({ themeId, status: 'error', message: error.message }); });
    return () => { active = false; images.forEach((image) => { image.onload = null; image.onerror = null; }); };
  }, [themeId]);
  return assets.themeId === themeId ? assets : { status: 'loading' };
}
