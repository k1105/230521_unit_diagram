import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, useRef } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { updateHandposeHistory } from "../lib/updateHandposeHistory";
import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { isFront } from "../lib/calculator/isFront";
import { Monitor } from "./Monitor";

type Props = {
  handpose: MutableRefObject<Hand[]>;
};

const mainColor = 0;

let rightHand: Keypoint[] = [];
let rightHandOpacity: number = 0;

type Handpose = Keypoint[];

const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const HandSketch = ({ handpose }: Props) => {
  let handposeHistory: {
    left: Handpose[];
    right: Handpose[];
  } = { left: [], right: [] };

  const debugLog = useRef<{ label: string; value: any }[]>([]);

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(mainColor);
    p5.fill(mainColor);
    p5.strokeWeight(10);
  };

  const draw = (p5: p5Types) => {
    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current);
    handposeHistory = updateHandposeHistory(rawHands, handposeHistory); //handposeHistoryの更新
    const hands: {
      left: Handpose;
      right: Handpose;
    } = getSmoothedHandpose(rawHands, handposeHistory); //平滑化された手指の動きを取得する

    // logとしてmonitorに表示する
    debugLog.current = [];
    for (const hand of handpose.current) {
      debugLog.current.push({
        label: hand.handedness + " accuracy",
        value: hand.score,
      });
      debugLog.current.push({
        label: hand.handedness + " is front",
        //@ts-ignore
        value: isFront(hand.keypoints, hand.handedness.toLowerCase()),
      });
    }

    p5.clear();

    if (hands.right.length > 0) {
      rightHand = hands.right;
      rightHandOpacity = Math.min(255, rightHandOpacity + 255 / 10);
    } else {
      rightHandOpacity = Math.max(0, rightHandOpacity - 255 / 10);
    }

    rightHandOpacity = 255;

    if (rightHand.length > 0) {
      p5.push();
      p5.fill(mainColor, rightHandOpacity);
      p5.translate(p5.width / 2 - 150, p5.height / 2);
      p5.noStroke();

      p5.textAlign(p5.CENTER);

      const d = rightHand[8].y - rightHand[5].y;

      p5.push(); //first row
      p5.text("dot finger", 0, 50);
      for (let i = 5; i < 9; i++) {
        p5.ellipse(
          rightHand[i].x - rightHand[5].x,
          rightHand[i].y - rightHand[5].y,
          10
        );
      }

      p5.translate(150, 0);
      p5.push();
      p5.text("line finger", 0, 50);
      p5.strokeWeight(10);
      p5.stroke(mainColor, rightHandOpacity);
      for (let i = 5; i < 8; i++) {
        p5.line(
          rightHand[i].x - rightHand[5].x,
          rightHand[i].y - rightHand[5].y,
          rightHand[i + 1].x - rightHand[5].x,
          rightHand[i + 1].y - rightHand[5].y
        );
      }
      p5.pop();
      p5.translate(150, 0);
      p5.push();
      p5.text("cross", 0, 50);
      const lineLength = 50;
      p5.strokeWeight(10);
      p5.stroke(mainColor, rightHandOpacity);
      const a = Math.min(Math.max(-d / 50, 0), Math.PI / 2);
      for (let index = 0; index < 2; index++) {
        p5.push(); //1
        p5.push(); //2
        p5.translate(0, -lineLength * Math.sin(a));
        p5.push(); //3
        p5.rotate((-1) ** index * a);
        p5.line(-lineLength, 0, lineLength, 0);
        p5.pop(); //3
        p5.pop(); //2
        p5.pop(); //1
      }
      p5.pop();
      //first row
      p5.pop();

      const r = 80;

      p5.translate(0, 150);

      p5.push();
      //second row
      p5.push();
      p5.text("diamond", 0, 50);
      if (r < Math.abs(d)) {
        //none;
      } else if (d > 0) {
        //none;
      } else {
        p5.beginShape();
        p5.vertex(0, 0);
        p5.vertex(Math.sqrt(r ** 2 - d ** 2) / 2, d / 2);
        p5.vertex(0, d);
        p5.vertex(-Math.sqrt(r ** 2 - d ** 2) / 2, d / 2);
        p5.endShape(p5.CLOSE);
      }
      p5.pop();

      p5.translate(150, 0);
      p5.push();
      p5.text("circle", 0, 50);
      p5.translate(0, Math.min(d, 0) * 0.5);
      p5.ellipse(0, 0, Math.min(d, 0) * 0.5);
      p5.pop();

      p5.translate(150, 0);

      p5.push();
      p5.text("bend", 0, 50);
      p5.strokeWeight(10);
      p5.stroke(mainColor, rightHandOpacity);
      if (r < Math.abs(d)) {
        p5.line(0, 0, 0, -r);
      } else if (d > 0) {
        p5.line(0, 0, r / 2, 0);
      } else {
        p5.line(0, 0, Math.sqrt(r ** 2 - d ** 2) / 2, d / 2);
        p5.line(Math.sqrt(r ** 2 - d ** 2) / 2, d / 2, 0, d);
      }
      p5.pop();
      //second row
      p5.pop();

      p5.pop();
    }
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  return (
    <>
      <Monitor handpose={handpose} debugLog={debugLog} />
      <Sketch
        preload={preload}
        setup={setup}
        draw={draw}
        windowResized={windowResized}
      />
    </>
  );
};
