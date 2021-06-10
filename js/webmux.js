const rowCount = 40;
const colCount = 40;

const SplitDirection = Object.freeze({
  'horizontal': 'horizontal',
  'vertical': 'vertical'
});

class Container {
  constructor(parent, size, splitDirection) {
    this.parent = parent;
    this.size = size;
    this.splitDirection = splitDirection;
    this.children = [];
  }

  changeParent(parent) {
    this.parent = parent;
  }

  appendChild(child) {
    this.children.push(child);
  }

  indexOf(child) {
    return this.children.indexOf(child);
  }

  insertChild(child, position) {
    this.children.splice(position, 0, child);
  }

  removeChild(child) {
    let index = this.children.indexOf(child);
    if (this.children.length > 1 && this.splitDirection !== null) {
      const whIndex = this.splitDirection === SplitDirection.vertical? 0: 1;
      if (index == this.children.length - 1) {
        this.children[index - 1].size[whIndex] += child.size[whIndex];
      } else {
        this.children[index + 1].size[whIndex] += child.size[whIndex];
      }
    }

    this.children.splice(index, 1);
    if (this.parent !== null) {
      if (this.children.length === 0) {
        this.parent.removeChild(this);
        // TODO: delete this ?
      } else if (this.children.length === 1) {
        // container must have two or more children
        this.parent.replaceChild(this, this.children[0]);
        this.children[0].changeParent(this.parent);
        // TODO: delete this ?
      }
    }
    rootContainer.reload();
  }

  replaceChild(oldChild, newChild) {
    const index = this.children.indexOf(oldChild);
    this.children.splice(index, 1, newChild);
  }

  getPosition() {
    let position = [1, 1];
    if (this.parent != null) {
      position = this.parent.getChildPosition(this);
    }
    return position;
  }

  getChildPosition(child) {
    let position = this.getPosition();
    for (var i = 0; i < this.children.length; i++) {
      if (this.children[i] === child || this.splitDirection === null) return position;
      const whIndex = this.splitDirection === SplitDirection.vertical? 0: 1;
      position[whIndex] += this.children[i].size[whIndex];
    }
    console.error('cannot find position');
  }

  split(splitDirection) {
    const whIndex = splitDirection === SplitDirection.vertical? 0: 1;
    let newMySize = this.size.slice();
    newMySize[whIndex] = parseInt(newMySize[whIndex] / 2);
    let newOtherSize = this.size.slice();
    newOtherSize[whIndex] = this.size[whIndex] - newMySize[whIndex];

    if (this.parent !== null && this.parent.splitDirection == splitDirection) {
      let newChild = new Pane(this.parent, newOtherSize);
      let position = this.parent.indexOf(this);
      this.parent.insertChild(newChild, position + 1);
      this.size = newMySize;
      this.parent.reload();
    } else {
      let newParent = new Container(this.parent, this.size, splitDirection);
      let newChild = new Pane(newParent, newOtherSize);
      this.size = newMySize;
      if (this.parent !== null)
        this.parent.replaceChild(this, newParent);
      this.changeParent(newParent);

      newParent.appendChild(this);
      newParent.appendChild(newChild);
      newParent.reload();
    }
  }

  resizeChild(child, size, direction) {
    const whIndex = direction === SplitDirection.horizontal? 0: 1;
    // ここの条件わかりにくいので直す（そもそもresizeでsplitDirectionってのがよくわからん）
    if (this.splitDirection === null || this.splitDirection === direction) {
      if (this.parent !== null) this.parent.resizeChild(this, size, direction);
      return;
    }
    if (this.children.length < 2) {
      console.error('invalid child size: ' + this.children.length);
    }

    const index = this.children.indexOf(child);
    if (index === this.children.length - 1) {
      // most bottom/right pane has different direction
      if (this.children[index - 1].size[whIndex] + size > 0 &&
          this.children[index].size[whIndex] - size > 0) {
        this.children[index - 1].size[whIndex] += size;
        this.children[index].size[whIndex] -= size;
      }
    } else {
      if (this.children[index].size[whIndex] + size > 0 &&
          this.children[index + 1].size[whIndex] - size > 0) {
        this.children[index].size[whIndex] += size;
        this.children[index + 1].size[whIndex] -= size;
      }
    }

    rootContainer.reload();
  }

  reload() {
    if (this.splitDirection === null) {
      for (var i = 0; i < this.children.length; i++) this.children[i].reload();
    }

    const fixedAxis = this.splitDirection === SplitDirection.horizontal? 0: 1;
    const movableAxis = this.splitDirection === SplitDirection.horizontal? 1: 0;
    // propagate its size to the children
    let totalHaba = 0;
    for (var i = 0; i < this.children.length; i++)
      totalHaba += this.children[i].size[movableAxis];
    if (this.size[movableAxis] !== totalHaba) {
      let resizeRatio = this.size[movableAxis] / totalHaba;
      totalHaba = 0;
      for (var i = 0; i < this.children.length - 1; i++) {
        this.children[i].size[movableAxis] = parseInt(this.children[i].size[movableAxis] * resizeRatio);
        totalHaba += this.children[i].size[movableAxis];
      }
      this.children[this.children.length - 1].size[movableAxis] = this.size[movableAxis] - totalHaba;
    }
    for (var i = 0; i < this.children.length; i++) {
      this.children[i].size[fixedAxis] = this.size[fixedAxis];
      this.children[i].reload();
    }
  }
}

class Pane extends Container {
  constructor(parent, size) {
    super(parent, size, null);

    this.div = document.createElement('div');
    document.getElementById('container').appendChild(this.div);

    this.iframe = document.createElement('iframe');
    this.iframe.src = '/static/html/pane.html';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.cssFloat = 'relative';
    this.iframe.frameBorder = '0';
    this.div.appendChild(this.iframe);

    this.command_triggered = false;
    this.onload = this.onLoad.bind(this);
    this.onkeydown = this.onKeyDown.bind(this);
    this.iframe.addEventListener('load', this.onload, false);
  }

  remove() {
    document.getElementById('container').removeChild(this.div);
    this.parent.removeChild(this);
  }

  reload() {
    const position = this.getPosition();
    this.div.style.gridColumn = position[0] + '/' + (position[0] + this.size[0]);
    this.div.style.gridRow = position[1] + '/' + (position[1] + this.size[1]);
  }

  onLoad() {
    return this.iframe.contentWindow.document.addEventListener('keydown', this.onkeydown);
  }

  onKeyDown(event) {
    if (event.key === 'b' && event.ctrlKey) {
      this.command_triggered = true;
      return;
    }
    if (this.command_triggered) {
      if (event.key === '"') {
        console.info('split horizontally');
        this.split(SplitDirection.horizontal);
        this.command_triggered = false;
      } else if (event.key === '%') {
        console.info('split vertically');
        this.split(SplitDirection.vertical);
        this.command_triggered = false;
      } else if (event.key === 'd') {
        console.info('remove');
        this.remove();
        rootContainer.reload();
        this.command_triggered = false;
      } else if (event.key === 'ArrowLeft') {
        console.info('left');
        this.parent.resizeChild(this, -1, SplitDirection.horizontal);
        this.command_triggered = false;
      } else if (event.key === 'ArrowRight') {
        console.info('right');
        this.parent.resizeChild(this, 1, SplitDirection.horizontal);
        this.command_triggered = false;
      } else if (event.key === 'ArrowUp') {
        console.info('up');
        this.parent.resizeChild(this, -1, SplitDirection.vertical);
        this.command_triggered = false;
      } else if (event.key === 'ArrowDown') {
        console.info('down');
        this.parent.resizeChild(this, 1, SplitDirection.vertical);
        this.command_triggered = false;
      }
    }
  }
}

let rootContainer = undefined;

window.onload = function () {
  var wrapper = document.getElementById('container');
  wrapper.style.display = 'grid';
  wrapper.style.gridTemplateRows = 'repeat(' + rowCount + ', ' + 100.0 / rowCount + '%)';
  wrapper.style.gridTemplateColumns = 'repeat(' + colCount + ', ' + 100.0 / colCount + '%)';

  // rootContainer = new Pane(null, colCount, rowCount);
  rootContainer = new Container(null, [colCount, rowCount], null);
  let initialPane = new Pane(rootContainer, [colCount, rowCount]);
  rootContainer.appendChild(initialPane);
  rootContainer.reload();
}
