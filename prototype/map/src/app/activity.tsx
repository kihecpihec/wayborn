import React from "react";
import { Text } from "react-native";
import Destination from "../Destination";
import { useWalkSession } from "../WalkSession";

const labels = {
  idle: "No walk this session.",
  waiting: "Waiting for GPS",
  active: "Recording walk",
  paused: "Walk paused",
  interrupted: "Walk interrupted",
  finished: "Walk finished",
};

export default function Activity() {
  const { session: { phase, track } } = useWalkSession();
  return (
    <Destination title="Activity">
      <Text accessibilityLiveRegion="polite">{labels[phase]}</Text>
      {track.position && (
        <>
          <Text>{Math.round(track.meters)} m · {Math.floor(track.elapsed)} s active</Text>
          <Text>This walk is kept for the current app session.</Text>
        </>
      )}
    </Destination>
  );
}
