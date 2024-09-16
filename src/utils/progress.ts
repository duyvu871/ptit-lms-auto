import readline from 'readline';

export class ProgressBar {
    private total: number;
    private current: number;
    private barLength: number;
    private description: string;

    constructor(total: number, description = 'Progress') {
        this.total = total;
        this.current = 0;
        this.barLength = process.stdout.columns - 50;
        this.description = description;
        this.update(this.current);
    }

    public update(current: number) {
        this.current = current;
        const progress = this.current / this.total;
        const filledLength = Math.floor(progress * this.barLength);
        const emptyLength = this.barLength - filledLength;

        const filledBar = '█'.repeat(filledLength);
        const emptyBar = '░'.repeat(emptyLength);
        const percentage = (progress * 100).toFixed(2);

        readline.cursorTo(process.stdout, 0);
        process.stdout.write(
            `${this.description}: [${filledBar}${emptyBar}] ${percentage}%`
        );
    }

    public finish() {
        this.update(this.total);
        process.stdout.write('\n');
    }
}

export class LoadingStripe {
    private stripeLength: number;
    private stripePosition: number;
    private timer: NodeJS.Timeout | null;
    private description: string;

    constructor(description = 'Loading') {
        this.stripeLength = 10;
        this.stripePosition = 0;
        this.timer = null;
        this.description = description;
        this.start();
    }

    public start() {
        this.timer = setInterval(() => {
            this.update();
        }, 100);
    }

    public update() {
        const stripe = '-'.repeat(this.stripePosition % this.stripeLength) + '>';
        const spaces = ' '.repeat(this.stripeLength - stripe.length);

        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`${this.description}: [${stripe}${spaces}]`);
        this.stripePosition++;
    }

    public stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            readline.cursorTo(process.stdout, 0);
            process.stdout.write('\r' + ' '.repeat(process.stdout.columns - 1));
            readline.cursorTo(process.stdout, 0);
        }
    }
}