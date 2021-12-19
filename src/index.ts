import { ETargetType } from "./db/enums";
import { upsertPolicy } from "./services";

upsertPolicy("policy 1", "service 1", [
  {
    name: "level 1",
    escalation: 1,
    targets: [{ type: ETargetType.EMAIL, contact: "user@mail.com" }],
  },
]).then((res) => {
  console.log(res);
  console.log(res.policiesLevels[0]?.level);
});
