import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calculator as CalculatorIcon, X } from "lucide-react";

export function Calculator({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const handleNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleOperation = (op: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForNewValue(true);
    setOperation(op);
  };

  const calculate = (firstValue: number, secondValue: number, op: string): number => {
    switch (op) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "×":
        return firstValue * secondValue;
      case "÷":
        return secondValue !== 0 ? firstValue / secondValue : 0;
      default:
        return secondValue;
    }
  };

  const handleEquals = () => {
    if (previousValue !== null && operation) {
      const inputValue = parseFloat(display);
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const handleDecimal = () => {
    if (waitingForNewValue) {
      setDisplay("0.");
      setWaitingForNewValue(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalculatorIcon className="h-5 w-5" />
            Calculator
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Display */}
          <div className="bg-muted p-4 rounded-lg text-right font-mono text-2xl font-bold min-h-[60px] flex items-center justify-end">
            {display}
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" onClick={handleClear} className="col-span-2">
              Clear
            </Button>
            <Button variant="outline" onClick={() => handleOperation("÷")}>
              ÷
            </Button>
            <Button variant="outline" onClick={() => handleOperation("×")}>
              ×
            </Button>

            <Button variant="outline" onClick={() => handleNumber("7")}>
              7
            </Button>
            <Button variant="outline" onClick={() => handleNumber("8")}>
              8
            </Button>
            <Button variant="outline" onClick={() => handleNumber("9")}>
              9
            </Button>
            <Button variant="outline" onClick={() => handleOperation("-")}>
              −
            </Button>

            <Button variant="outline" onClick={() => handleNumber("4")}>
              4
            </Button>
            <Button variant="outline" onClick={() => handleNumber("5")}>
              5
            </Button>
            <Button variant="outline" onClick={() => handleNumber("6")}>
              6
            </Button>
            <Button variant="outline" onClick={() => handleOperation("+")}>
              +
            </Button>

            <Button variant="outline" onClick={() => handleNumber("1")}>
              1
            </Button>
            <Button variant="outline" onClick={() => handleNumber("2")}>
              2
            </Button>
            <Button variant="outline" onClick={() => handleNumber("3")}>
              3
            </Button>
            <Button variant="default" onClick={handleEquals} className="row-span-2">
              =
            </Button>

            <Button variant="outline" onClick={() => handleNumber("0")} className="col-span-2">
              0
            </Button>
            <Button variant="outline" onClick={handleDecimal}>
              .
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

