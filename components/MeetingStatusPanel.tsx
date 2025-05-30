import React from "react";
import StatusIndicator from "./StatusIndicator";
import ActionButton from "./ActionButton";

type Status = "idle" | "joined" | "awaiting" | "stopped";

interface MeetingStatusPanelProps {
  status: Status;
  isGoogleMeet: boolean;
  isInjected: boolean;
  error: string | null;
  currentUrl: string;
  notes: string;
  isLoading: boolean;
  onStart: () => void;
  onStop: () => void;
}

const MeetingStatusPanel: React.FC<MeetingStatusPanelProps> = ({
  status,
  isGoogleMeet,
  isInjected,
  error,
  currentUrl,
  notes,
  isLoading,
  onStart,
  onStop,
}) => (
  <div className="bg-white rounded-xl shadow-md p-4 mb-5 flex-grow border border-gray-100">
    <StatusIndicator status={status} isGoogleMeet={isGoogleMeet} />
    {isGoogleMeet && isInjected && (
      <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-green-700 text-xs">
        ✓ Code injected into Google Meet
      </div>
    )}
    {error && (
      <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-fadeIn">
        {error}
      </div>
    )}
    {!isGoogleMeet && status === "idle" && (
      <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-sm">
        Please navigate to a Google Meet tab to use this extension.
      </div>
    )}
    {isGoogleMeet && status === "idle" && (
      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-sm">
        <p>✓ Ready to take notes for: {currentUrl}</p>
      </div>
    )}
    {status === "joined" && (
      <>
        <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-sm mb-2">
          Meeting in progress - AI is capturing notes
        </div>
        <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-700 max-h-24 overflow-y-auto border border-gray-200">
          <pre className="whitespace-pre-wrap font-mono">{notes}</pre>
        </div>
      </>
    )}
    <div className="flex gap-3 justify-center mt-4">
      {status === "idle" && isGoogleMeet && (
        <ActionButton onClick={onStart} isLoading={isLoading} variant="primary">
          Start Bot
        </ActionButton>
      )}
      {status === "joined" && (
        <ActionButton onClick={onStop} variant="danger" isLoading={isLoading}>
          Stop Bot
        </ActionButton>
      )}
    </div>
  </div>
);

export default MeetingStatusPanel;
