const rowCount = 20;
const colCount = 20;

const SplitDirection = Object.freeze({
  'horizontal': 'horizontal',
  'vertical': 'vertical'
});

class Container {
  constructor(parent, width, height, splitDirection) {
    this.parent = parent;
    this.width = width;
    this.height = height;
    this.splitDirection = splitDirection;
    this.childs = [];
  }

  changeParent(parent) {
    this.parent = parent;
  }

  appendChild(child) {
    this.childs.push(child);
  }

  removeChild(child) {
    this.childs = this.childs.filter(item => item !== child);
    if (this.childs.length === 0) {
      if (this.parent !== null) this.parent.removeChild(this);
    }
  }

  replaceChild(oldChild, newChild) {
    const index = this.childs.indexOf(oldChild);
    this.childs.splice(index, 1, newChild);
  }

  getPosition() {
    let position = [1, 1];
    if (this.parent != null) {
      position = this.parent.getChildPosition(this);
    }
    return position;
  }

  getChildPosition(child) {
    console.info(child);
    let position = this.getPosition();
    for (var i = 0; i < this.childs.length; i++) {
      if (this.childs[i] === child) return position;
      if (this.splitDirection == SplitDirection.vertical) {
        position[0] += this.childs[i].width;
      } else if (this.splitDirection == SplitDirection.horizontal) {
        position[1] += this.childs[i].height;
      }
    }
    console.error('cannot find position');
  }

  splitHorizontally() {
    let newParent = new Container(this.parent, this.width, this.height, SplitDirection.horizontal);
    let newChild = new Pane(newParent, this.width, this.height);
    if (this.parent !== null)
      this.parent.replaceChild(this, newParent);
    this.changeParent(newParent);

    newParent.appendChild(this);
    newParent.appendChild(newChild);
    newParent.reload();
    console.info(rootContainer);
  }

  splitVertically() {
    let newParent = new Container(this.parent, this.width, this.height, SplitDirection.vertical);
    let newChild = new Pane(newParent, this.width, this.height);
    if (this.parent !== null)
      this.parent.replaceChild(this, newParent);
    this.changeParent(newParent);

    newParent.appendChild(this);
    newParent.appendChild(newChild);
    newParent.reload();
    console.info(rootContainer);
  }

  reload() {
    if (this.splitDirection == SplitDirection.vertical) {
      console.info(this.childs.length);
      const width = parseInt(this.width / this.childs.length);
      let totalWidth = 0;
      for (var i = 0; i < this.childs.length - 1; i++) {
        this.childs[i].width = width;
        this.childs[i].height = this.height;
        totalWidth += width;
      }
      this.childs.slice(-1)[0].width = this.width - totalWidth;
      this.childs.slice(-1)[0].height = this.height;
    } else if (this.splitDirection == SplitDirection.horizontal) {
      console.info(this.childs.length);
      const height = parseInt(this.height / this.childs.length);
      let totalHeight = 0;
      for (var i = 0; i < this.childs.length - 1; i++) {
        this.childs[i].width = this.width;
        this.childs[i].height = height;
        totalHeight += height;
      }
      this.childs.slice(-1)[0].width = this.width;
      this.childs.slice(-1)[0].height = this.height - totalHeight;
    }

    for (var i = 0; i < this.childs.length; i++) {
      console.info(this.childs[i].height);
      this.childs[i].reload();
    }
  }
}

class Pane extends Container {
  constructor(parent, width, height) {
    super(parent, width, height, null);

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
    console.info(position);
    this.div.style.gridColumn = position[0] + '/' + (position[0] + this.width);
    this.div.style.gridRow = position[1] + '/' + (position[1] + this.height);
  }

  onLoad() {
    console.info('onload');
    return this.iframe.contentWindow.document.addEventListener('keydown', this.onkeydown);
  }

  onKeyDown(event) {
    if (event.key === 'b' && event.ctrlKey) {
      console.info('triggered in iframe');
      this.command_triggered = true;
      return;
    }
    if (this.command_triggered) {
      if (event.key === '"') {
        console.info('split horizontally');
        this.splitHorizontally();
        this.command_triggered = false;
      } else if (event.key === '%') {
        console.info('split vertically');
        this.splitVertically();
        this.command_triggered = false;
      } else if (event.key === 'd') {
        console.info('remove');
        this.remove();
        rootContainer.reload();
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

  rootContainer = new Container(null, colCount, rowCount, null);
  let initialPane = new Pane(rootContainer, colCount, rowCount);
  rootContainer.appendChild(initialPane);
  rootContainer.reload();
}
