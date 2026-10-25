const paths = {
  plan: 'M4 4h16v16H4z M4 12h7V4 M11 12h9 M11 16v4',
  move: 'M5 3l5 17 3-7 7-3z',
  pan: 'M8 12V7a1 1 0 012 0v4-7a1 1 0 012 0v7-6a1 1 0 012 0v6-4a1 1 0 012 0v8c0 4-2 6-5 6h-1c-2 0-3-1-4-3l-3-5a1 1 0 012-1l2 3',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  fit: 'M9 4H4v5 M15 4h5v5 M4 15v5h5 M20 15v5h-5',
  undo: 'M8 5l-5 5 5 5 M3 10h10a6 6 0 010 12',
  heat: 'M12 3c1 5-4 5-4 9a4 4 0 008 0c0-1 0-2-1-3 4 2 5 5 4 8-1 3-4 4-7 4-5 0-8-3-8-7 0-5 6-6 8-11z',
  play: 'M8 4l12 8-12 8z',
  stop: 'M6 6h12v12H6z',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18 M12 7v5l3 2',
  flow: 'M4 17l6-6 4 3 6-9 M15 5h5v5',
};

export default function Icon({ name }) {
  return <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
