var hs1, hs2, hs3, hs4;

// 12 = 5min, 6 = 10min, 4 = 15min
var HourSteps;
var DaysToShow;

function initializeFields() {
    hs1 = null;
    hs2 = null;
    hs3 = null;
    hs4 = null;
    HourSteps = 4;
    DaysToShow = 4;
    firstDraw = true;
}

function setup() {
    initializeFields();
    createCanvas(640, 360);
    noStroke();
    // start_time
    hs1 = new HScrollbar(160, 20, 360, 16, 8);
    // r_int
    hs2 = new HScrollbar(160, 40, 360, 16, 8);
    // t_int
    hs3 = new HScrollbar(160, 60, 360, 16, 8);
    // ftt
    hs4 = new HScrollbar(160, 80, 360, 16, 8);
}

var firstDraw;

function draw() {
    // Update and map variables
    // These are mapped to the range 0-24
    var f_start_time = float(round(map(hs1.getPos(), 0, 360, 0, 24 * HourSteps))) / HourSteps;
    var f_r_int = float(round(map(hs2.getPos(), 0, 360, 0, 24 * HourSteps))) / HourSteps;
    var f_t_int = float(round(map(hs3.getPos(), 0, 360, 0, DaysToShow * 24 * HourSteps))) / HourSteps;
    var f_ftt = float(round(map(hs4.getPos(), 0, 360, 0, 24 * HourSteps))) / HourSteps;
    // Create the integer versions of the variables
    // These are in the range 0-86400
    var start_time = int(f_start_time * 86400 / 24);
    var r_int = int(f_r_int * 86400 / 24);
    var t_int = int(f_t_int * 86400 / 24);
    var ftt = int(f_ftt * 86400 / 24);
    // Default to off if they're zero
    if (r_int == 0)
        r_int = -1;
    if (t_int == 0)
        t_int = -1;
    if (ftt == 0)
        ftt = -1;
    // Update the Sliders
    var updated = false;
    updated |= hs1.update();
    updated |= hs2.update();
    updated |= hs3.update();
    updated |= hs4.update();
    // no need to re-draw the screen if we're not calculating anything
    if (updated == false && firstDraw == false) {
        hs1.display();
        hs2.display();
        hs3.display();
        hs4.display();
        return;
    }
    background(255);
    fill(0);
    hs1.display();
    hs2.display();
    hs3.display();
    hs4.display();
    // Slider Labels
    fill(0);
    text("Start Time:", 10, 25);
    text("Reading Interval:", 10, 45);
    text("Transmission Interval:", 10, 65);
    text("FTT Time:", 10, 85);
    // Slider Value display
    text(formatTime(f_start_time), 530, 25);
    if (r_int != -1)
        text("" + f_r_int + " hours", 530, 45);
    else
        text("Default", 530, 45);
    if (t_int != -1)
        text("" + f_t_int + " hours", 530, 65);
    else
        text("Default", 530, 65);
    if (ftt != -1)
        text(formatTime(f_ftt), 530, 85);
    else
        text("Disabled", 530, 85);
    // Plot Box
    stroke(50);
    fill(200);
    rect(10, 100, 620, 250);
    // Data Box
    stroke(200);
    fill(220);
    rect(80, 150, 480, 150);
    // Y-Axis Labels
    fill(0);
    text("Xmit", 43, 200);
    text("Reading", 20, 250);
    // X-Axis Labels
    var hour = 0;
    for (var i = 80; i <= 560; i += 20) {
        if (hour % (2 * DaysToShow) == 0)
            text("" + hour, i - 5, 310);
        stroke(((hour % 24 == 0) ? 175 : 200));
        line(i, 300, i, 150);
        hour += (DaysToShow % 24);
    }
    // Legend
    fill(0);
    for (var i = 0; i < DaysToShow; i++) {
        var offset = (i * (560 - 80) / DaysToShow) + (560 - 80) / (2 * DaysToShow) - 15;
        text("Day " + (i + 1), 80 + offset, 140);
    }
    // Plotting the Data
    var scheduleObj;
    var reading_count = 0;
    scheduleObj = nextAlarm(start_time, r_int, t_int, ftt, reading_count);
    reading_count += 1;
    // Plot first reading
    plotAlarm(scheduleObj[0], scheduleObj[1]);
    // Iterate two days worth of readings
    var iterations = 0;
    while (scheduleObj[0] < DaysToShow * 86400 && iterations < 200) {
        scheduleObj = nextAlarm(scheduleObj[0], r_int, t_int, ftt, reading_count);
        if (scheduleObj[1] == 0)
            reading_count += 1;
        else
            reading_count = 0;
        plotAlarm(scheduleObj[0], scheduleObj[1]);
        iterations++;
    }
    firstDraw = false;
}

// Function to schedule the next alarm
function nextAlarm(time, r_int, t_int, ftt, reading_count) {
    // Sanity check
    if (r_int == -1)
        r_int = 21600;
    if (t_int == -1)
        t_int = 86400;
    if (r_int > t_int)
        t_int = r_int;
    // Default to now + r_int
    var nextAlarm = time + r_int;
    var nextTransmit = 0;
    if (ftt != -1) {
        var time_to_ftt = secondsToAlarm(time, ftt) - r_int;
        if (time_to_ftt > -((r_int / 2) + 60) && time_to_ftt < (r_int / 2) + 60) {
            nextAlarm = ftt + (time - (time % 86400));
            nextTransmit = 2;
        }
    }
    // omg this bug fix was this easy im a complete moron
    if (nextAlarm < time) {
        nextAlarm += 86400;
    }

    var n = int( t_int / r_int );
    if (n != 0)
        nextTransmit |= ((reading_count + 1) % n == 0) ? 1 : 0;
    // bundle em up and return them
    var returnVal = [ nextAlarm, nextTransmit ];
    return returnVal;
}

// Function to plot the alarm point
function plotAlarm(alarmTime, transmission) {
    var size = 3;
    if (alarmTime < (DaysToShow * 86400))
        fill(50);
    else {
        fill(150);
        size = 2;
        alarmTime = alarmTime % (DaysToShow * 86400);
    }
    var px = int(map(alarmTime, 0, DaysToShow * 86400, 0, 480)) + 80;
    // probably not right
    var py = (transmission > 0) ? 195 : 245;
    noStroke();
    if (transmission < 2)
        rect(px - size, py - size, size + size, size + size);
    else
        triangle(px - size, py - size, px, py + size, px + size, py - size);
}

function formatTime(time) {
    // This part is really easy
    var hour = floor(time);
    var am_not_pm = (hour < 12);
    // Converts the 0-1 range into 0-60 range
    var min = int(60 * (time - hour));
    // Converting away from military time
    if (!am_not_pm)
        hour -= 12;
    if (hour == 0)
        hour = 12;
    var s_time = "" + hour;
    // Need to add a 0 before if we only have one digit
    s_time = s_time + ((min < 10) ? ":0" : ":") + min;
    // Append AM/PM to the end
    s_time = s_time + ((am_not_pm) ? " AM" : " PM");
    return s_time;
}

function secondsToAlarm(time, alarm) {
    time = time % 86400;
    alarm = alarm % 86400;
    if (alarm <= time) {
        alarm += 86400;
    }
    return alarm - time;
}

class HScrollbar {
    constructor(xp, yp, sw, sh, l) {
        this.swidth = sw;
        this.sheight = sh;
        this.xpos = xp;
        this.ypos = yp - this.sheight / 2;
        // xpos + swidth/16 - this.sheight/2;
        this.spos = this.xpos + 1;
        this.newspos = this.spos;
        this.sposMin = this.xpos;
        this.sposMax = this.xpos + this.swidth - this.sheight;
        this.loose = l;
    }

    update() {
        if (this.overEvent()) {
            this.over = true;
        } else {
            this.over = false;
        }
        if (mouseIsPressed && this.over) {
            this.locked = true;
        }
        if (!mouseIsPressed) {
            this.locked = false;
        }
        if (this.locked) {
            this.newspos = this.constrain(mouseX - this.sheight / 2, this.sposMin, this.sposMax);
        }
        if (abs(this.newspos - this.spos) > 1) {
            this.spos = this.spos + (this.newspos - this.spos) / this.loose;
            return true;
        } else {
            return false;
        }
    }

    constrain(val, minv, maxv) {
        return min(max(val, minv), maxv);
    }

    overEvent() {
        if (mouseX > this.xpos && mouseX < this.xpos + this.swidth && mouseY > this.ypos && mouseY < this.ypos + this.sheight) {
            return true;
        } else {
            return false;
        }
    }

    display() {
        noStroke();
        fill(204);
        rect(this.xpos, this.ypos, this.swidth, this.sheight);
        if (this.over || this.locked) {
            fill(0, 0, 0);
        } else {
            fill(102, 102, 102);
        }
        rect(this.spos, this.ypos, this.sheight, this.sheight);
    }

    getPos() {
        // 0 and the total width of the scrollbar
        return round(map(this.spos - this.xpos - 1, 0, this.swidth - this.sheight - 2, 0, this.swidth));
    }
}