// 곡 카탈로그
// ---------------------------------------------------------------------------
// lyrics: [{ t: 시작초, d: 길이초, text: 가사 }] — LRC 와 같은 타임코드 구조.
//
// ⚠️ 실제 곡 가사·음원은 저작권 대상입니다. 서비스에 실가사를 넣으려면
//    음악저작권협회(KOMCA) 등과 이용 계약 또는 가사 제공 API 라이선스가 필요합니다.
//    아래 폴킴 곡은 메타데이터만 실제 정보이고, 가사는 타이밍 확인용 자리표시자입니다.
//    라이선스 받은 가사가 생기면 text 만 교체하면 됩니다.
// ---------------------------------------------------------------------------

function placeholderLyrics(sections, startAt = 0, lineSec = 4.5) {
  const out = [];
  let t = startAt;
  for (const [label, count, gapAfter = 0] of sections) {
    for (let i = 1; i <= count; i++) {
      out.push({ t, d: lineSec, text: `♪ ${label} ${i}번째 소절` });
      t += lineSec;
    }
    t += gapAfter;
  }
  return out;
}

export const SONGS = [
  {
    id: 'paulkim-every-day-every-moment',
    title: '모든 날, 모든 순간',
    titleEn: 'Every day, Every Moment',
    artist: '폴킴',
    artistEn: 'Paul Kim',
    album: "키스 먼저 할까요? OST Part.3",
    released: '2018-03',
    genre: '발라드',
    // TODO: 노래방 번호(TJ/금영)와 정확한 음원 길이는 제휴 데이터로 교체
    number: '—',
    durationSec: 226,
    art: ['#FFB8C6', '#8B7CFF'],
    featured: true,
    popular: 1,
    lyricsLicensed: false,
    lyrics: placeholderLyrics(
      [
        ['1절', 8, 4],
        ['후렴', 8, 12],
        ['2절', 6, 4],
        ['후렴', 8, 10],
        ['브릿지', 4, 2],
        ['마지막 후렴', 8],
      ],
      14, // 전주
    ),
  },

  // ---- 아래는 UI 목업의 임의 예시 데이터 ----
  { id: 'dawn-city', title: '새벽 두 시의 도시', artist: '루미', genre: '발라드', number: '48213', durationSec: 222, art: ['#FF5C8A', '#8B7CFF'], popular: 2 },
  { id: 'wave', title: '파도가 지나간 자리', artist: '해온', genre: '발라드', number: '31907', durationSec: 245, art: ['#3DD6C4', '#3B5BDB'], popular: 3 },
  { id: 'summer-end', title: '여름 끝자락', artist: '모노크롬', genre: '댄스', number: '27755', durationSec: 198, art: ['#FFB84D', '#FF5C5C'], popular: 4 },
  { id: 'neon', title: '네온 사인', artist: 'VELA', genre: '댄스', number: '19042', durationSec: 210, art: ['#8B7CFF', '#1F1B4D'], popular: 5 },
  { id: 'sleepless-city', title: '잠들지 않는 도시', artist: '해온', genre: '힙합', number: '31866', durationSec: 245, art: ['#3DD6C4', '#3B5BDB'] },
  { id: 'rainy-city', title: '비 내리는 도시의 밤', artist: '모노크롬', genre: '발라드', number: '27410', durationSec: 198, art: ['#FFB84D', '#FF5C5C'] },
  { id: 'city-stars', title: '도시 위의 별', artist: 'VELA', genre: '힙합', number: '19038', durationSec: 236, art: ['#8B7CFF', '#1F1B4D'] },
  { id: 'strange-city', title: '낯선 도시에서', artist: '서리', genre: '발라드', number: '44577', durationSec: 261, art: ['#6BE585', '#1B7F6B'] },
];

// 가사가 없는 예시곡에는 자리표시자 가사를 채워 노래 부르기 화면을 테스트할 수 있게 함
for (const s of SONGS) {
  if (!s.lyrics) s.lyrics = placeholderLyrics([['1절', 8, 4], ['후렴', 8, 8], ['2절', 6, 4], ['후렴', 8]], 10);
}

export const getSong = (id) => SONGS.find((s) => s.id === id);

export function searchSongs(q, field = 'all') {
  const query = q.trim().toLowerCase().replace(/\s+/g, '');
  if (!query) return [];
  const norm = (v) => (v || '').toLowerCase().replace(/[\s,]+/g, '');
  const fields = {
    title: (s) => [s.title, s.titleEn],
    artist: (s) => [s.artist, s.artistEn],
    number: (s) => [s.number],
    all: (s) => [s.title, s.titleEn, s.artist, s.artistEn, s.number],
  }[field];
  return SONGS.filter((s) => fields(s).some((v) => norm(v).includes(query.replace(/,/g, ''))));
}
