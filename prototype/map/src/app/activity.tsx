import React from "react";
import { Pressable, Text } from "react-native";
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

const when = (at: number) => new Date(at).toLocaleString();

export default function Activity() {
  const {
    session: { phase, track, completed },
    walks,
    saveError,
    activeWalkId,
    saving,
    finish,
  } = useWalkSession();
  const { drafts, pending, settle } = walks;
  return (
    <Destination title="Activity">
      <Text accessibilityLiveRegion="polite">
        {saving ? "Saving walk…" : labels[phase]}
      </Text>
      {track.position && (
        <Text>
          {Math.round(track.meters)} m · {Math.floor(track.elapsed)} s active
        </Text>
      )}
      {completed
        .map((walk) => (
          <Text key={walk.number} accessibilityRole="header">
            Walk {walk.number}
          </Text>
        ))
        .flatMap((title, index) => [
          title,
          <Text key={"summary" + index}>
            Completed · {Math.round(completed[index].meters)} m ·{" "}
            {Math.floor(completed[index].elapsed)} s active
          </Text>,
        ])}
      {saveError !== "" && <Text accessibilityRole="alert">{saveError}</Text>}
      {saveError !== "" && phase !== "finished" && (
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void finish()}
        >
          <Text>Retry saving walk</Text>
        </Pressable>
      )}
      {walks.status === "loading" && <Text>Opening saved walks…</Text>}
      {walks.status === "unavailable" && (
        <Text>
          Walks are not saved in the browser. Use the mobile app to keep them.
        </Text>
      )}
      {walks.error !== "" && (
        <Text accessibilityRole="alert">{walks.error}</Text>
      )}
      {walks.refreshFailed && (
        <Pressable
          accessibilityRole="button"
          onPress={() => void walks.refresh()}
        >
          <Text>Retry saved walks</Text>
        </Pressable>
      )}
      {walks.status === "failed" && (
        <Pressable
          accessibilityRole="button"
          onPress={() => void walks.retry()}
        >
          <Text>Retry storage</Text>
        </Pressable>
      )}
      {drafts
        .filter((draft) => draft.id !== activeWalkId)
        .map((draft) => (
          <React.Fragment key={draft.id}>
            <Text>Unfinished walk from {when(draft.at)}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={walks.busy}
              onPress={() => void settle("recover", draft.id)}
            >
              <Text>Keep this walk</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={walks.busy}
              onPress={() => void settle("discard", draft.id)}
            >
              <Text>Discard</Text>
            </Pressable>
          </React.Fragment>
        ))}
      {pending.map((walk) => (
        <Text key={walk.id}>
          Saved on this device, waiting to sync · {when(walk.at)}
        </Text>
      ))}
    </Destination>
  );
}
