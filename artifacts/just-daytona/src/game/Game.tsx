import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Scene } from './Scene';
import { GameUI } from './GameUI';
import { MultiplayerPanel } from './MultiplayerPanel';
import { LapSelectScreen } from './LapSelectScreen';
import { LobbyScreen } from './LobbyScreen';
import { ResultsScreen } from './ResultsScreen';
import { useMultiplayer } from './useMultiplayer';
import { KEY_MAP, AI_COUNT, MAX_BOTS, CAR_NAMES, CAR_COLORS } from './constants';
import { UiState, VehicleType, GameMode, ChatMessage } from './types';
import { ChatPanel } from './ChatPanel';

type AppPhase = 'menu' | 'lobby' | 'racing' | 'finished';

export function Game() {
  const [uiState, setUiState] = useState<UiState>({ speed: 0, laps: 0, position: 1, countdown: 3.99 });
  const [phase, setPhase] = useState<AppPhase>('menu');
  const [totalLaps, setTotalLaps] = useState(10);

  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [gameMode, setGameMode] = useState<GameMode>('race');
  const [carNumber, setCarNumber] = useState(50);
  const [carColor, setCarColor] = useState('#CC1111');

  const [playerName, setPlayerNameState] = useState<string>(() => localStorage.getItem('driver-name') || '');
  function setPlayerName(name: string) {
    setPlayerNameState(name);
    if (name) localStorage.setItem('driver-name', name);
    else localStorage.removeItem('driver-name');
  }

  const spawnBotRef = useRef(0);
  const [botCount, setBotCount] = useState(AI_COUNT);
  function handleSpawnBot() {
    if (botCount >= MAX_BOTS) return;
    spawnBotRef.current++;
    setBotCount(c => c + 1);
  }

  const botPunishmentQueuesRef = useRef<string[][]>(Array.from({ length: MAX_BOTS }, () => []));
  const handleLocalBotAction = useCallback((botIdx: number, action: string) => {
    const q = botPunishmentQueuesRef.current[botIdx];
    if (q) q.push(action);
  }, []);

  const {
    mode, passcode, playerCount, error, alert, remoteTotalLaps, isRaining,
    chatMessages, playerList, raceSettings, remotePlayersRef, punishmentQueueRef, teleportQueueRef,
    createRoom, joinRoom, leaveRoom, sendUpdate, sendStartRace, adminAction, sendGlobalAction, sendTeleportAll, sendChatMessage,
  } = useMultiplayer();

  const initialBotCountRef = useRef<number | undefined>(undefined);

  const handleSendChat = useCallback((text: string) => {
    sendChatMessage(text, playerName || 'DRIVER', carColor);
  }, [sendChatMessage, playerName, carColor]);

  const playerPosRef = useRef({ x: 295, z: 0, heading: 0 });
  const pendingHostTeleportRef = useRef(false);

  const handleTeleportAll = useCallback(() => {
    sendTeleportAll(playerPosRef.current.x, playerPosRef.current.z, playerPosRef.current.heading);
    pendingHostTeleportRef.current = true;
  }, [sendTeleportAll]);

  const remotePlayerNames = playerList.map(p => p.name);
  const localBotList = Array.from({ length: botCount }, (_, i) => ({
    idx: i,
    name: CAR_NAMES[(i + 1) % CAR_NAMES.length],
    color: CAR_COLORS[(i + 1) % CAR_COLORS.length],
  }));

  // When room created/joined → go to lobby
  useEffect(() => {
    if (phase !== 'menu') return;
    if (mode === 'hosting' || mode === 'joined') {
      setPhase('lobby');
    }
  }, [mode, phase]);

  // When server broadcasts raceStarted → apply settings and begin race
  useEffect(() => {
    if (!raceSettings || phase !== 'lobby') return;
    setTotalLaps(raceSettings.totalLaps);
    setGameMode(raceSettings.gameMode as typeof gameMode);
    setVehicleType(raceSettings.vehicleType as typeof vehicleType);
    initialBotCountRef.current = raceSettings.botCount;
    setBotCount(raceSettings.botCount);
    spawnBotRef.current = 0;
    setPhase('racing');
  }, [raceSettings, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Race finish → show results after brief delay
  const finishHandled = useRef(false);
  useEffect(() => {
    if (uiState.raceFinished && phase === 'racing' && !finishHandled.current) {
      finishHandled.current = true;
      const t = setTimeout(() => setPhase('finished'), 3000);
      return () => clearTimeout(t);
    }
    if (!uiState.raceFinished) finishHandled.current = false;
    return undefined;
  }, [uiState.raceFinished, phase]);

  // Wrap createRoom to include totalLaps automatically
  const handleCreateRoom = useCallback((code: string, name: string) => {
    createRoom(code, name, totalLaps);
  }, [createRoom, totalLaps]);

  function handleRaceAgain() {
    leaveRoom();
    finishHandled.current = false;
    setUiState({ speed: 0, laps: 0, position: 1, countdown: 3.99 });
    spawnBotRef.current = 0;
    setBotCount(AI_COUNT);
    initialBotCountRef.current = undefined;
    setPhase('menu');
  }

  const isInGame = phase === 'racing' || phase === 'finished';

  function handleStartRace(botCount: number) {
    sendStartRace(botCount, gameMode, vehicleType);
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>

      {/* Pre-race lobby */}
      {phase === 'menu' && (
        <LapSelectScreen
          totalLaps={totalLaps}
          onSetLaps={setTotalLaps}
          playerName={playerName}
          onSetName={setPlayerName}
          vehicleType={vehicleType}
          onSetVehicle={setVehicleType}
          gameMode={gameMode}
          onSetGameMode={setGameMode}
          carNumber={carNumber}
          onSetCarNumber={setCarNumber}
          carColor={carColor}
          onSetCarColor={setCarColor}
          mode={mode}
          error={error}
          onStartOffline={() => setPhase('racing')}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={joinRoom}
        />
      )}

      {/* Multiplayer lobby */}
      {phase === 'lobby' && (
        <LobbyScreen
          isHost={mode === 'hosting'}
          passcode={passcode}
          playerCount={playerCount}
          playerList={playerList}
          totalLaps={totalLaps}
          gameMode={gameMode}
          vehicleType={vehicleType}
          onStartRace={handleStartRace}
          onLeave={() => { leaveRoom(); setPhase('menu'); }}
        />
      )}

      {/* 3-D game canvas */}
      {isInGame && (
        <KeyboardControls map={KEY_MAP}>
          <Canvas
            shadows
            camera={{ position: [295, 16, 32], fov: 72, near: 0.5, far: 2200 }}
            gl={{ antialias: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <Scene
              onUiUpdate={setUiState}
              totalLaps={totalLaps}
              vehicleType={vehicleType}
              gameMode={gameMode}
              initialBotCount={initialBotCountRef.current}
              carNumber={carNumber}
              carColor={carColor}
              remotePlayersRef={remotePlayersRef}
              punishmentQueueRef={punishmentQueueRef}
              teleportQueueRef={teleportQueueRef}
              playerPosRef={playerPosRef}
              pendingHostTeleportRef={pendingHostTeleportRef}
              onPositionUpdate={mode !== 'offline' ? sendUpdate : undefined}
              spawnBotRef={spawnBotRef}
              remotePlayerNames={remotePlayerNames}
              botPunishmentQueuesRef={botPunishmentQueuesRef}
            />
          </Canvas>
        </KeyboardControls>
      )}

      {/* Racing HUD */}
      {phase === 'racing' && (
        <GameUI
          speed={uiState.speed}
          laps={uiState.laps}
          totalLaps={totalLaps}
          position={uiState.position}
          countdown={uiState.countdown}
          totalCars={uiState.totalCars}
          playerName={mode !== 'offline' ? playerName : undefined}
          damage={uiState.damage}
          lapTime={uiState.lapTime}
          lastLapTime={uiState.lastLapTime}
          bestLapTime={uiState.bestLapTime}
          leaderboard={uiState.leaderboard}
          greenFlag={uiState.greenFlag}
          rainDelay={uiState.rainDelay}
          nukeActive={uiState.nukeActive}
          spectating={uiState.spectating}
          activeGameMode={uiState.activeGameMode}
          chatMessages={chatMessages}
          driftScore={uiState.driftScore}
          driftCombo={uiState.driftCombo}
          driftTimer={uiState.driftTimer}
          demolitionAlive={uiState.demolitionAlive}
          playerInfected={uiState.playerInfected}
          playerHasPotato={uiState.playerHasPotato}
          potatoTimer={uiState.potatoTimer}
          knockoutTimer={uiState.knockoutTimer}
          carPositions={uiState.carPositions}
          nitroFuel={uiState.nitroFuel}
          wrongWay={uiState.wrongWay}
          pitStopTimer={uiState.pitStopTimer}
        />
      )}

      {/* Post-race results */}
      {phase === 'finished' && (
        <ResultsScreen
          leaderboard={uiState.leaderboard ?? []}
          onRaceAgain={handleRaceAgain}
        />
      )}

      {/* Multiplayer side panel — only visible during race */}
      {isInGame && (
        <>
          {alert && (
            <div style={{
              position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.88)',
              border: '2px solid #C41230',
              borderRadius: 8,
              padding: '12px 28px',
              color: '#fff',
              fontSize: 18,
              fontFamily: '"Arial Narrow", Arial, sans-serif',
              fontWeight: 700,
              letterSpacing: 1,
              textAlign: 'center',
              zIndex: 200,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 30px rgba(196,18,48,0.6)',
            }}>
              {alert}
            </div>
          )}

          {phase === 'racing' && <ChatPanel onSend={handleSendChat} />}

          <MultiplayerPanel
            mode={mode}
            passcode={passcode}
            playerCount={playerCount}
            error={error}
            playerList={playerList}
            onAdminAction={adminAction}
            onGlobalAction={sendGlobalAction}
            onTeleportAll={handleTeleportAll}
            isRaining={isRaining}
            onCreate={handleCreateRoom}
            onJoin={joinRoom}
            onLeave={leaveRoom}
            playerName={playerName}
            onSetName={setPlayerName}
            botCount={botCount}
            onSpawnBot={handleSpawnBot}
            localBotList={localBotList}
            onLocalBotAction={handleLocalBotAction}
          />
        </>
      )}
    </div>
  );
}
