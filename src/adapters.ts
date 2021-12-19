/* eslint-disable @typescript-eslint/no-unused-vars */
import { Target } from ".prisma/client";

export class TimerAdapter {
  public setTimer(
    _timeout: Date,
    _callback: (incidentId: number, timer: TimerAdapter, notifier: NotifierAdapter) => void
  ) {
    // not implemented
    // -> trigger callback after timeout
  }
}

export class NotifierAdapter {
  public notify(_target: Target) {
    // not implemented
    // -> send sms to SMS target, send email to email target
  }
}
