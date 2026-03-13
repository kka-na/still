# STILL — Time Photography

같은 구도로 시간의 흐름을 기록하고, 타임랩스 영상으로 내보내는 웹 서비스.

---

## 사전 요구사항

- **Node.js** v18+
- **ffmpeg** (서버에 설치 필요)

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS (Homebrew)
brew install ffmpeg
```

---

## 설치 및 실행

### 1. 백엔드

```bash
cd backend
npm install
npm start          # 프로덕션
# 또는
npm run dev        # 개발 (nodemon, 자동 재시작)
```

백엔드는 기본 `http://localhost:3001` 에서 실행됩니다.

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
# 또는
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
```

### 3. 프로덕션 배포 (빌드 후 Express로 서빙)

```bash
cd frontend && npm run build
```

그리고 `backend/server.js` 하단에 추가:

```js
// 정적 파일 서빙 (빌드 후)
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

---

## 기능

### 컬렉션 (카테고리)
- 무제한 컬렉션 생성 (목련, 벚꽃, 내 얼굴, 건물 등 무엇이든)
- 컬렉션별 사진 관리

### 카메라
- **첫 번째 촬영** → 자동으로 기준 구도(레퍼런스) 이미지로 등록
- **이후 촬영** → 레퍼런스 이미지가 반투명 오버레이로 표시
- 오버레이 불투명도 슬라이더 (0–80%)
- 전/후면 카메라 전환
- `REF` 버튼 → 현재 화면을 새 레퍼런스로 교체
- `Space` 키보드 단축키

### 사진 관리
- 시간 순 자동 정렬
- 라이트박스(확대 보기) + 좌우 탐색
- 개별 사진 삭제

### 내보내기 (MP4)
- 장면당 재생 시간 설정 (0.1초 ~ 5.0초, 기본 0.5초)
- 예상 총 길이 미리보기
- H.264 MP4 파일 다운로드

---

## 데이터 구조

```
backend/uploads/
  categories.json         ← 컬렉션 메타데이터
  {category-id}/
    reference.jpg         ← 기준 구도 이미지
    photos/
      {timestamp}.jpg     ← 촬영된 사진들 (시간순 정렬)
    output.mp4            ← 내보내기 임시 파일
```

---

## 환경 변수

```bash
# backend/.env (선택)
PORT=3001
```

---

## 포트 변경 방법

- **백엔드 포트**: `backend/server.js`의 `PORT` 변수 또는 환경변수 `PORT`
- **프론트엔드 개발 서버 포트**: `frontend/vite.config.js`의 `server.port`
- **프록시 주소**: `frontend/vite.config.js`의 `proxy` 설정
