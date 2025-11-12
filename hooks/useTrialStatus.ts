// Trial-Period wurde entfernt - alle User müssen sofort zahlen
export function useTrialStatus() {
  return {
            isInTrial: false,
    trialEndTime: null,
    trialDaysLeft: 0,
    isTrialExpired: true,
    isLoading: false
  };
}
